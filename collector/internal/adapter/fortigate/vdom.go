package fortigate

import (
	"context"
	"fmt"
	"net/url"
	"strings"
)

// Dominios virtuales.
//
// Un FortiGate mediano o grande suele partirse en varios VDOM —una sede por
// dominio, o un cliente por dominio si lo administra un proveedor— y **cada uno
// tiene sus propias políticas, interfaces, publicaciones y túneles**. La API
// devuelve por defecto los del dominio de administración: sin pedir el resto,
// se auditaría uno y los demás quedarían aprobados sin que nadie los mirara.
//
// Es el mismo fallo que las cuentas ocultas y las secciones que no se pedían,
// con la diferencia de que aquí lo que falta no es un campo: es un cliente
// entero.
//
// Verificado contra un FortiGate real: `cmdb/system/vdom` lista los dominios y
// `?vdom=<nombre>` acota la consulta. En un equipo sin VDOM devuelve `root`, y
// entonces todo funciona igual que antes.

// scopedGet consulta un endpoint dentro de un dominio virtual.
func (a *Adapter) scopedGet(ctx context.Context, vdom, path string, out any) error {
	if vdom == "" {
		return a.get(ctx, path, out)
	}

	separator := "?"
	if strings.Contains(path, "?") {
		separator = "&"
	}
	return a.get(ctx, path+separator+"vdom="+url.QueryEscape(vdom), out)
}

// fetchVDOMs lista los dominios virtuales del equipo.
//
// Devuelve además si la lista es de fiar. Cuando el usuario de API no puede
// enumerarlos, se sigue auditando el dominio por defecto —es mejor que nada—
// pero el informe tiene que decir que no sabe si hay más, en vez de dar a
// entender que revisó el equipo entero.
func (a *Adapter) fetchVDOMs(ctx context.Context) ([]string, bool) {
	var list struct {
		Results []struct {
			Name string `json:"name"`
		} `json:"results"`
	}
	if err := a.get(ctx, "cmdb/system/vdom", &list); err != nil {
		return []string{""}, false
	}

	names := make([]string, 0, len(list.Results))
	for _, entry := range list.Results {
		if entry.Name != "" {
			names = append(names, entry.Name)
		}
	}
	if len(names) == 0 {
		return []string{""}, false
	}
	return names, true
}

// etiqueta antepone el dominio cuando hay más de uno.
//
// Sin esto, la política 2 de un cliente y la política 2 de otro comparten
// identificador: el segundo hallazgo pisa al primero y uno de los dos
// desaparece del informe. Con un solo dominio no se antepone nada, para no
// llenar de ruido el caso normal.
func etiqueta(vdom string, varios bool, value string) string {
	if !varios || vdom == "" {
		return value
	}
	return fmt.Sprintf("%s/%s", vdom, value)
}
