// Package vault keeps the customer's raw logs on the customer's own disk
// (design section 6.3).
//
// This is the promise the product is sold on: the raw lines never reach the
// cloud. They are written here first, before parsing, so a format the adapter
// does not recognise is still kept and can be investigated later.
package vault

import (
	"compress/gzip"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// Vault writes one gzip file per device and hour, and prunes by age and quota.
type Vault struct {
	root string
	// RetentionDays is 0 (off), 7, 15 or 30 depending on the plan.
	retentionDays int
	// QuotaBytes caps disk use; when reached, the oldest hour goes first.
	quotaBytes int64

	mu      sync.Mutex
	current map[string]*openFile
}

type openFile struct {
	hour   time.Time
	path   string
	file   *os.File
	writer *gzip.Writer
}

func New(root string, retentionDays int, quotaBytes int64) *Vault {
	return &Vault{
		root:          root,
		retentionDays: retentionDays,
		quotaBytes:    quotaBytes,
		current:       make(map[string]*openFile),
	}
}

// Enabled reports whether the plan includes the vault.
func (v *Vault) Enabled() bool { return v.retentionDays > 0 }

func (v *Vault) pathFor(deviceID string, hour time.Time) string {
	return filepath.Join(
		v.root,
		deviceID,
		hour.Format("2006-01-02"),
		fmt.Sprintf("%02d.log.gz", hour.Hour()),
	)
}

// Write appends a raw line. Called before parsing on purpose: an unrecognised
// format must not be lost.
func (v *Vault) Write(deviceID string, when time.Time, line []byte) error {
	if !v.Enabled() {
		return nil
	}

	hour := when.UTC().Truncate(time.Hour)

	v.mu.Lock()
	defer v.mu.Unlock()

	open, ok := v.current[deviceID]
	if ok && !open.hour.Equal(hour) {
		if err := closeFile(open); err != nil {
			return err
		}
		delete(v.current, deviceID)
		ok = false
	}

	if !ok {
		path := v.pathFor(deviceID, hour)
		if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
			return fmt.Errorf("crear directorio de bóveda: %w", err)
		}
		file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o640)
		if err != nil {
			return fmt.Errorf("abrir archivo de bóveda: %w", err)
		}
		open = &openFile{hour: hour, path: path, file: file, writer: gzip.NewWriter(file)}
		v.current[deviceID] = open
	}

	if _, err := open.writer.Write(append(line, '\n')); err != nil {
		return fmt.Errorf("escribir en la bóveda: %w", err)
	}

	return nil
}

// Flush pushes buffered bytes to disk without closing the hour. Called every
// minute: a power cut must not cost more than a minute of raw logs.
func (v *Vault) Flush() error {
	v.mu.Lock()
	defer v.mu.Unlock()

	for _, open := range v.current {
		if err := open.writer.Flush(); err != nil {
			return err
		}
	}
	return nil
}

// Close finishes every open hour.
func (v *Vault) Close() error {
	v.mu.Lock()
	defer v.mu.Unlock()

	for deviceID, open := range v.current {
		if err := closeFile(open); err != nil {
			return err
		}
		delete(v.current, deviceID)
	}
	return nil
}

func closeFile(open *openFile) error {
	if err := open.writer.Close(); err != nil {
		open.file.Close()
		return err
	}
	return open.file.Close()
}

type storedFile struct {
	path    string
	modTime time.Time
	size    int64
}

func (v *Vault) list() ([]storedFile, int64, error) {
	var files []storedFile
	var total int64

	err := filepath.Walk(v.root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if os.IsNotExist(err) {
				return nil
			}
			return err
		}
		if info.IsDir() || filepath.Ext(path) != ".gz" {
			return nil
		}

		files = append(files, storedFile{path: path, modTime: info.ModTime(), size: info.Size()})
		total += info.Size()
		return nil
	})
	if err != nil {
		return nil, 0, err
	}

	sort.Slice(files, func(i, j int) bool { return files[i].modTime.Before(files[j].modTime) })
	return files, total, nil
}

// Rotate deletes what falls outside retention and, if the quota is still
// exceeded, keeps deleting the oldest hour first (section 6.3).
//
// Returns how many files it removed.
func (v *Vault) Rotate(now time.Time) (int, error) {
	files, total, err := v.list()
	if err != nil {
		return 0, err
	}

	removed := 0
	cutoff := now.AddDate(0, 0, -v.retentionDays)

	for _, file := range files {
		if !file.modTime.Before(cutoff) {
			continue
		}
		if err := os.Remove(file.path); err != nil {
			return removed, err
		}
		total -= file.size
		removed++
	}

	if v.quotaBytes <= 0 {
		return removed, nil
	}

	for _, file := range files {
		if total <= v.quotaBytes {
			break
		}
		if err := os.Remove(file.path); err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return removed, err
		}
		total -= file.size
		removed++
	}

	return removed, nil
}

// UsedBytes is what the vault occupies right now, for the heartbeat.
func (v *Vault) UsedBytes() (int64, error) {
	_, total, err := v.list()
	return total, err
}
