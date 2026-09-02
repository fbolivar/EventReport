package aggregate

import (
	"sort"

	"github.com/fbolivar/eventreport/collector/internal/normalize"
)

// La actividad por persona, cuando casi nadie inicia sesión.
//
// Sobre el tráfico real de un FortiGate 40F en una PYME: `user` aparece en 47
// de 429 líneas —once por ciento—. Un producto que solo sepa agrupar por
// usuario autenticado enseña una pantalla vacía en la empresa promedio, que es
// justo el cliente. Por eso la atribución baja por una escalera y **dice en qué
// escalón se quedó**, en vez de hacer pasar el nombre de un equipo por una
// persona:
//
//	usuario   sesión iniciada contra el directorio o el portal cautivo
//	equipo    nombre que el equipo anunció por DHCP
//	huella    sistema operativo y MAC, cuando no hay nombre
//	dirección la IP, que siempre está
//
// El portal muestra el escalón junto al nombre. Un informe que dice "usuario"
// sobre una IP es una afirmación falsa; uno que dice "dirección 192.168.2.11"
// es verdad y sigue sirviendo para trabajar.
type IdentityKind string

const (
	KindUser    IdentityKind = "user"
	KindHost    IdentityKind = "host"
	KindPrint   IdentityKind = "fingerprint"
	KindAddress IdentityKind = "address"
)

// IdentitiesPerHour limita cuántas identidades viajan por hora y firewall.
//
// Una red con doscientos equipos activos en una hora ya es una mediana empresa;
// más allá, lo que sobra es ruido de fondo —un escáner, un dispositivo roto— y
// no interesa a un informe. Se conservan las de más tráfico.
const IdentitiesPerHour = 200

// TopPerIdentity limita el detalle de cada una: sus aplicaciones, categorías y
// destinos más usados. Diez es lo que cabe en una tarjeta sin volverse un
// volcado de registros.
const TopPerIdentity = 10

// Identity es una fila de rollups_identity_hourly.
type Identity struct {
	Kind     IdentityKind `json:"kind"`
	Key      string       `json:"key"`
	Label    string       `json:"label"`
	Sessions int64        `json:"sessions"`
	Allowed  int64        `json:"allowed"`
	Denied   int64        `json:"denied"`
	BytesIn  int64        `json:"bytesIn"`
	BytesOut int64        `json:"bytesOut"`
	Top      []TopEntry   `json:"top"`
}

// identityOf decide a quién se le atribuye una sesión.
//
// Devuelve falso cuando la línea no permite atribuir nada —un registro de
// sistema del propio firewall, sin origen—, que no es un fallo: simplemente no
// cuenta para la actividad de nadie.
func identityOf(event *normalize.Event) (IdentityKind, string, string, bool) {
	switch {
	case event.User != "":
		return KindUser, "user:" + event.User, event.User, true
	case event.SrcName != "":
		return KindHost, "host:" + event.SrcName, event.SrcName, true
	case event.SrcMAC != "":
		label := event.SrcMAC
		if event.OSName != "" {
			label = event.OSName + " · " + event.SrcMAC
		}
		return KindPrint, "mac:" + event.SrcMAC, label, true
	case event.SrcIP != "":
		return KindAddress, "ip:" + event.SrcIP, event.SrcIP, true
	default:
		return "", "", "", false
	}
}

// identity acumula una sesión en la identidad que le corresponde.
func (b *bucket) identity(event *normalize.Event) {
	kind, key, label, ok := identityOf(event)
	if !ok {
		return
	}

	current, seen := b.identities[key]
	if !seen {
		current = &identityBucket{
			Kind:  kind,
			Key:   key,
			Label: label,
			top:   make(map[topKey]*TopEntry),
		}
		b.identities[key] = current
	}

	current.Sessions++
	current.BytesIn += event.BytesIn
	current.BytesOut += event.BytesOut

	switch event.Action {
	case normalize.ActionDeny, normalize.ActionBlock:
		current.Denied++
	default:
		current.Allowed++
	}

	bytes := event.BytesIn + event.BytesOut
	add := func(dimension Dimension, value string) {
		if value == "" {
			return
		}
		entryKey := topKey{dimension: dimension, key: value}
		entry, exists := current.top[entryKey]
		if !exists {
			entry = &TopEntry{Dimension: dimension, Key: value}
			current.top[entryKey] = entry
		}
		entry.Count++
		entry.Bytes += bytes
	}

	add(DimApp, event.App)
	add(DimWebCategory, event.Category)
	add(DimDstIP, event.DstIP)
}

type identityBucket struct {
	Kind     IdentityKind
	Key      string
	Label    string
	Sessions int64
	Allowed  int64
	Denied   int64
	BytesIn  int64
	BytesOut int64
	top      map[topKey]*TopEntry
}

// identitiesOf ordena por tráfico, recorta a IdentitiesPerHour y deja en cada
// una solo su detalle más usado.
func identitiesOf(current *bucket) []Identity {
	out := make([]Identity, 0, len(current.identities))
	for _, entry := range current.identities {
		out = append(out, Identity{
			Kind:     entry.Kind,
			Key:      entry.Key,
			Label:    entry.Label,
			Sessions: entry.Sessions,
			Allowed:  entry.Allowed,
			Denied:   entry.Denied,
			BytesIn:  entry.BytesIn,
			BytesOut: entry.BytesOut,
			Top:      topOf(entry.top),
		})
	}

	sort.Slice(out, func(i, j int) bool {
		left, right := out[i], out[j]
		leftBytes := left.BytesIn + left.BytesOut
		rightBytes := right.BytesIn + right.BytesOut
		if leftBytes != rightBytes {
			return leftBytes > rightBytes
		}
		if left.Sessions != right.Sessions {
			return left.Sessions > right.Sessions
		}
		// Empate: por clave, para que dos ejecuciones den lo mismo.
		return left.Key < right.Key
	})

	if len(out) > IdentitiesPerHour {
		out = out[:IdentitiesPerHour]
	}
	return out
}

// topOf ordena el detalle de una identidad y lo recorta por dimensión.
func topOf(top map[topKey]*TopEntry) []TopEntry {
	byDimension := make(map[Dimension][]TopEntry)
	for _, entry := range top {
		byDimension[entry.Dimension] = append(byDimension[entry.Dimension], *entry)
	}

	out := make([]TopEntry, 0, len(top))
	for _, entries := range byDimension {
		sort.Slice(entries, func(i, j int) bool {
			if entries[i].Bytes != entries[j].Bytes {
				return entries[i].Bytes > entries[j].Bytes
			}
			if entries[i].Count != entries[j].Count {
				return entries[i].Count > entries[j].Count
			}
			return entries[i].Key < entries[j].Key
		})
		if len(entries) > TopPerIdentity {
			entries = entries[:TopPerIdentity]
		}
		out = append(out, entries...)
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].Dimension != out[j].Dimension {
			return out[i].Dimension < out[j].Dimension
		}
		return out[i].Bytes > out[j].Bytes
	})
	return out
}
