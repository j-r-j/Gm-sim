import { useGameMetaStore } from '../state/store';

describe('useGameMetaStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameMetaStore.setState({
      currentSaveSlot: null,
      lastSaved: null,
    });
  });

  describe('initial state', () => {
    it('should have null currentSaveSlot initially', () => {
      const state = useGameMetaStore.getState();
      expect(state.currentSaveSlot).toBeNull();
    });

    it('should have null lastSaved initially', () => {
      const state = useGameMetaStore.getState();
      expect(state.lastSaved).toBeNull();
    });
  });

  describe('setCurrentSaveSlot', () => {
    it('should set currentSaveSlot to 0', () => {
      useGameMetaStore.getState().setCurrentSaveSlot(0);
      expect(useGameMetaStore.getState().currentSaveSlot).toBe(0);
    });

    it('should set currentSaveSlot to 1', () => {
      useGameMetaStore.getState().setCurrentSaveSlot(1);
      expect(useGameMetaStore.getState().currentSaveSlot).toBe(1);
    });

    it('should set currentSaveSlot to 2', () => {
      useGameMetaStore.getState().setCurrentSaveSlot(2);
      expect(useGameMetaStore.getState().currentSaveSlot).toBe(2);
    });

    it('should set currentSaveSlot back to null', () => {
      useGameMetaStore.getState().setCurrentSaveSlot(1);
      useGameMetaStore.getState().setCurrentSaveSlot(null);
      expect(useGameMetaStore.getState().currentSaveSlot).toBeNull();
    });

    it('should update currentSaveSlot when changing slots', () => {
      useGameMetaStore.getState().setCurrentSaveSlot(0);
      expect(useGameMetaStore.getState().currentSaveSlot).toBe(0);

      useGameMetaStore.getState().setCurrentSaveSlot(2);
      expect(useGameMetaStore.getState().currentSaveSlot).toBe(2);
    });
  });

  describe('setLastSaved', () => {
    it('should set lastSaved to a date string', () => {
      const dateString = '2024-01-15T10:30:00.000Z';
      useGameMetaStore.getState().setLastSaved(dateString);
      expect(useGameMetaStore.getState().lastSaved).toBe(dateString);
    });

    it('should set lastSaved back to null', () => {
      useGameMetaStore.getState().setLastSaved('2024-01-15T10:30:00.000Z');
      useGameMetaStore.getState().setLastSaved(null);
      expect(useGameMetaStore.getState().lastSaved).toBeNull();
    });

    it('should update lastSaved when saving again', () => {
      const firstSave = '2024-01-15T10:30:00.000Z';
      const secondSave = '2024-01-15T11:00:00.000Z';

      useGameMetaStore.getState().setLastSaved(firstSave);
      expect(useGameMetaStore.getState().lastSaved).toBe(firstSave);

      useGameMetaStore.getState().setLastSaved(secondSave);
      expect(useGameMetaStore.getState().lastSaved).toBe(secondSave);
    });
  });

  describe('combined operations', () => {
    it('should handle setting both values', () => {
      useGameMetaStore.getState().setCurrentSaveSlot(1);
      useGameMetaStore.getState().setLastSaved('2024-01-15T10:30:00.000Z');

      const state = useGameMetaStore.getState();
      expect(state.currentSaveSlot).toBe(1);
      expect(state.lastSaved).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should maintain currentSaveSlot when updating lastSaved', () => {
      useGameMetaStore.getState().setCurrentSaveSlot(2);
      useGameMetaStore.getState().setLastSaved('2024-01-15T10:30:00.000Z');

      expect(useGameMetaStore.getState().currentSaveSlot).toBe(2);
    });

    it('should maintain lastSaved when updating currentSaveSlot', () => {
      useGameMetaStore.getState().setLastSaved('2024-01-15T10:30:00.000Z');
      useGameMetaStore.getState().setCurrentSaveSlot(0);

      expect(useGameMetaStore.getState().lastSaved).toBe('2024-01-15T10:30:00.000Z');
    });
  });
});
