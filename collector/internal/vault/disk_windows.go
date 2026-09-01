//go:build windows

package vault

import (
	"syscall"
	"unsafe"
)

// FreeGB devuelve el espacio libre del disco donde vive la bóveda.
//
// El portal lo muestra porque es lo que decide cuántos días de registros caben:
// un colector con el disco lleno deja de guardar y nadie se entera hasta que
// hace falta la evidencia.
func FreeGB(path string) int {
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	getDiskFreeSpaceEx := kernel32.NewProc("GetDiskFreeSpaceExW")

	pointer, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return 0
	}

	var freeForCaller, total, free uint64
	ok, _, _ := getDiskFreeSpaceEx.Call(
		uintptr(unsafe.Pointer(pointer)),
		uintptr(unsafe.Pointer(&freeForCaller)),
		uintptr(unsafe.Pointer(&total)),
		uintptr(unsafe.Pointer(&free)),
	)
	if ok == 0 {
		return 0
	}

	return int(freeForCaller / (1024 * 1024 * 1024))
}
