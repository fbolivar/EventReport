//go:build !windows

package vault

import "syscall"

// FreeGB devuelve el espacio libre del disco donde vive la bóveda.
func FreeGB(path string) int {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		return 0
	}
	return int(stat.Bavail * uint64(stat.Bsize) / (1024 * 1024 * 1024))
}
