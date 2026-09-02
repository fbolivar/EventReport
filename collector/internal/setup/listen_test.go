package setup

import (
	"net"
	"testing"
)

// Ejecutar el instalador dos veces no puede terminar en un error de socket.
func TestListenUsaElPuertoSiguienteSiEstaOcupado(t *testing.T) {
	ocupado, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ocupado.Close()

	segundo, err := Listen(ocupado.Addr().String())
	if err != nil {
		t.Fatalf("el asistente debía abrir en otro puerto: %v", err)
	}
	defer segundo.Close()

	if segundo.Addr().String() == ocupado.Addr().String() {
		t.Fatal("abrió en el puerto ocupado")
	}
}
