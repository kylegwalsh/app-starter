import { storage } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('set', () => {
    it('writes a value to storage', () => {
      storage.set('sessionExisted', 'true');
      expect(localStorage.getItem('sessionExisted')).toBe('true');
    });

    it('overwrites an existing value', () => {
      storage.set('sessionExisted', 'first');
      storage.set('sessionExisted', 'second');
      expect(localStorage.getItem('sessionExisted')).toBe('second');
    });
  });

  describe('get', () => {
    it('retrieves a stored value', () => {
      localStorage.setItem('sessionExisted', 'true');
      expect(storage.get('sessionExisted')).toBe('true');
    });

    it('returns null for a key that was never set', () => {
      expect(storage.get('sessionExisted')).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes a stored value', () => {
      storage.set('sessionExisted', 'true');
      storage.delete('sessionExisted');
      expect(storage.get('sessionExisted')).toBeNull();
    });

    it('does nothing when deleting a key that does not exist', () => {
      expect(() => storage.delete('sessionExisted')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes all stored values', () => {
      storage.set('sessionExisted', 'true');
      storage.clear();
      expect(storage.get('sessionExisted')).toBeNull();
    });
  });
});
