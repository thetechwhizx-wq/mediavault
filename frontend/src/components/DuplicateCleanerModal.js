import React, { useState, useMemo } from 'react';
import './DuplicateCleanerModal.css';

function normalizeTitle(t) {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function DuplicateCleanerModal({
  media = [],
  onDeleteOne,
  onBulkDelete,
  onUpdateOne,
  onClose,
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'rewatches', 'exact'
  const [dismissedKeys, setDismissedKeys] = useState(new Set());
  const [selectedDeletes, setSelectedDeletes] = useState({}); // groupKey -> idToDelete
  const [isDeleting, setIsDeleting] = useState(false);

  // Group items by normalized title + type
  const duplicateGroups = useMemo(() => {
    const map = new Map();

    media.forEach((item) => {
      const key = `${normalizeTitle(item.title)}|${item.type}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });

    const groups = [];
    map.forEach((items, key) => {
      if (items.length > 1 && !dismissedKeys.has(key)) {
        // Sort by ID ascending (earliest first)
        const sorted = [...items].sort((a, b) => a.id - b.id);
        const itemA = sorted[0];
        const itemB = sorted[1];

        const datesDiffer =
          itemA.watchedDate && itemB.watchedDate && itemA.watchedDate !== itemB.watchedDate;
        const notesSayRewatch =
          (itemA.notes && /rewatch/i.test(itemA.notes)) ||
          (itemB.notes && /rewatch/i.test(itemB.notes)) ||
          itemA.status === 'rewatch' ||
          itemB.status === 'rewatch';

        const isPotentialRewatch = Boolean(datesDiffer || notesSayRewatch);
        const hasDifferentStatus =
          itemA.status !== itemB.status || itemA.notes !== itemB.notes;
        const isExactDuplicate = !datesDiffer && !hasDifferentStatus;

        groups.push({
          key,
          title: itemA.title,
          type: itemA.type,
          items: sorted,
          itemA,
          itemB,
          isPotentialRewatch,
          hasDifferentStatus,
          isExactDuplicate,
          datesDiffer,
        });
      }
    });

    return groups;
  }, [media, dismissedKeys]);

  // Filter groups according to active tab
  const filteredGroups = useMemo(() => {
    if (filterMode === 'rewatches') {
      return duplicateGroups.filter((g) => g.isPotentialRewatch);
    }
    if (filterMode === 'exact') {
      return duplicateGroups.filter((g) => g.isExactDuplicate);
    }
    return duplicateGroups;
  }, [duplicateGroups, filterMode]);

  const potentialRewatchesCount = duplicateGroups.filter(
    (g) => g.isPotentialRewatch
  ).length;
  const exactDuplicatesCount = duplicateGroups.filter(
    (g) => g.isExactDuplicate
  ).length;

  // By default, mark Item B (the later copy) as the one to delete
  const getIdToDelete = (group) => {
    if (selectedDeletes[group.key] !== undefined) {
      return selectedDeletes[group.key];
    }
    return group.itemB.id; // Default delete the later duplicate
  };

  const handleSwapTarget = (groupKey, currentTargetId, altTargetId) => {
    setSelectedDeletes((prev) => ({
      ...prev,
      [groupKey]: currentTargetId === altTargetId ? currentTargetId : altTargetId,
    }));
  };

  // Delete individual duplicate
  const handleDeleteGroupDuplicate = async (group) => {
    const idToDelete = getIdToDelete(group);
    const itemToDelete = group.items.find((m) => m.id === idToDelete);
    const itemToKeep = group.items.find((m) => m.id !== idToDelete);

    if (
      group.isPotentialRewatch &&
      !window.confirm(
        `⚠️ Wait: "${group.title}" has different watch dates (${group.itemA.watchedDate || 'No date'} vs ${group.itemB.watchedDate || 'No date'}).\n\nAre you sure you want to delete this instead of keeping it as a Rewatch?`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDeleteOne(idToDelete);
      // Remove from list
      setDismissedKeys((prev) => new Set([...prev, group.key]));
    } catch (err) {
      alert('Failed to delete item: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Convert duplicate into an intentional rewatch
  const handleMarkAsRewatch = async (group) => {
    const laterItem = group.itemB;
    try {
      setIsDeleting(true);
      await onUpdateOne(laterItem.id, {
        status: 'rewatch',
        notes: laterItem.notes ? `${laterItem.notes} (rewatch)` : 'rewatch',
      });
      // Mark as resolved
      setDismissedKeys((prev) => new Set([...prev, group.key]));
    } catch (err) {
      alert('Failed to update item: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Dismiss / keep both
  const handleKeepBoth = (groupKey) => {
    setDismissedKeys((prev) => new Set([...prev, groupKey]));
  };

  // 1-Click Clean all exact duplicates (Safely excludes potential rewatches)
  const handleCleanAllExact = async () => {
    const exactGroups = duplicateGroups.filter((g) => g.isExactDuplicate);
    if (exactGroups.length === 0) return;

    const idsToDelete = exactGroups.map((g) => getIdToDelete(g));

    if (
      !window.confirm(
        `Are you sure you want to clean ${idsToDelete.length} exact duplicates?\n\n(Potential rewatches with different watch dates will NOT be touched)`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await onBulkDelete(idsToDelete);
      // Dismiss all exact groups
      const newDismissed = new Set(dismissedKeys);
      exactGroups.forEach((g) => newDismissed.add(g.key));
      setDismissedKeys(newDismissed);
    } catch (err) {
      alert('Failed to clean exact duplicates: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay dup-overlay" onClick={onClose}>
      <div className="modal dup-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dup-header">
          <div className="dup-title-area">
            <span className="dup-logo">🧹</span>
            <div>
              <h2>Duplicate Manager</h2>
              <p className="dup-subtitle">
                Review and clean duplicate entries while protecting your intentional rewatches
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Top Controls & Tabs */}
        <div className="dup-tabs-bar">
          <div className="dup-tabs">
            <button
              className={`dup-tab ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All ({duplicateGroups.length})
            </button>
            <button
              className={`dup-tab ${filterMode === 'exact' ? 'active' : ''}`}
              onClick={() => setFilterMode('exact')}
            >
              Exact Duplicates ({exactDuplicatesCount})
            </button>
            <button
              className={`dup-tab ${filterMode === 'rewatches' ? 'active' : ''}`}
              onClick={() => setFilterMode('rewatches')}
            >
              🔄 Potential Rewatches ({potentialRewatchesCount})
            </button>
          </div>

          {exactDuplicatesCount > 0 && (
            <button
              className="btn-clean-exact"
              onClick={handleCleanAllExact}
              disabled={isDeleting}
              title="Quickly removes 100% identical duplicates while keeping rewatches safe"
            >
              ⚡ Clean {exactDuplicatesCount} Exact Duplicates
            </button>
          )}
        </div>

        {/* List of Duplicate Groups */}
        <div className="dup-body">
          {duplicateGroups.length === 0 ? (
            <div className="dup-empty-state">
              <span className="dup-empty-icon">✨</span>
              <h3>No Duplicates Found!</h3>
              <p>Your media vault is completely clean and organized.</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="dup-empty-state">
              <span className="dup-empty-icon">👌</span>
              <h3>No items in this category</h3>
              <p>Check the other tabs above to review remaining entries.</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const idToDelete = getIdToDelete(group);
              const isItemADelete = group.itemA.id === idToDelete;
              const isItemBDelete = group.itemB.id === idToDelete;

              return (
                <div
                  key={group.key}
                  className={`dup-group-card ${
                    group.isPotentialRewatch ? 'card-rewatch-alert' : ''
                  }`}
                >
                  {/* Card Title & Badges */}
                  <div className="dup-group-header">
                    <div className="dup-group-title">
                      <span className="dup-type-icon">
                        {group.type === 'movie'
                          ? '🎬'
                          : group.type === 'show'
                          ? '📺'
                          : '🎮'}
                      </span>
                      <h3>{group.title}</h3>
                    </div>

                    <div className="dup-status-badges">
                      {group.isPotentialRewatch && (
                        <span className="badge-rewatch-alert">
                          🔄 Possible Rewatch (Different Dates)
                        </span>
                      )}
                      {group.hasDifferentStatus && !group.isPotentialRewatch && (
                        <span className="badge-diff-status">
                          ⚠️ Different Status / Notes
                        </span>
                      )}
                      {group.isExactDuplicate && (
                        <span className="badge-exact">Exact Match</span>
                      )}
                    </div>
                  </div>

                  {/* Context notice if rewatch */}
                  {group.isPotentialRewatch && (
                    <div className="rewatch-notice-box">
                      <span>💡 <strong>Rewatch Check:</strong> These 2 entries have different watch dates: <strong>{group.itemA.watchedDate || 'No date'}</strong> vs <strong>{group.itemB.watchedDate || 'No date'}</strong>. If you enjoyed this multiple times, click <strong>"Mark as Rewatch"</strong> to keep both!</span>
                    </div>
                  )}

                  {/* Side-by-Side Comparison */}
                  <div className="dup-comparison-grid">
                    {/* Item A */}
                    <div
                      className={`dup-item-card ${
                        isItemADelete ? 'state-delete' : 'state-keep'
                      }`}
                      onClick={() =>
                        handleSwapTarget(group.key, idToDelete, group.itemA.id)
                      }
                    >
                      <div className="item-decision-tag">
                        {isItemADelete ? '🗑️ WILL BE DELETED' : '🛡️ KEEPING'}
                      </div>
                      <div className="dup-item-content">
                        {group.itemA.poster ? (
                          <img
                            src={group.itemA.poster}
                            alt=""
                            className="dup-poster"
                            onError={(e) => (e.target.style.display = 'none')}
                          />
                        ) : (
                          <div className="dup-poster-ph">🖼️</div>
                        )}
                        <div className="dup-details">
                          <span className="dup-id">ID: #{group.itemA.id}</span>
                          <div className="dup-detail-row">
                            <span className="dup-detail-label">Date:</span>
                            <span className="dup-detail-value highlight">
                              {group.itemA.watchedDate || '—'}
                            </span>
                          </div>
                          <div className="dup-detail-row">
                            <span className="dup-detail-label">Status:</span>
                            <span className="dup-detail-value">
                              {group.itemA.status}
                            </span>
                          </div>
                          {group.itemA.venue && (
                            <div className="dup-detail-row">
                              <span className="dup-detail-label">Venue:</span>
                              <span className="dup-detail-value">
                                {group.itemA.venue === 'theatre' ? '🎭 Theatre' : group.itemA.venue}
                              </span>
                            </div>
                          )}
                          {group.itemA.notes && (
                            <div className="dup-detail-row">
                              <span className="dup-detail-label">Notes:</span>
                              <span className="dup-detail-value italic">
                                {group.itemA.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Swap Indicator */}
                    <button
                      className="btn-swap-choice"
                      onClick={() =>
                        handleSwapTarget(
                          group.key,
                          idToDelete,
                          isItemADelete ? group.itemB.id : group.itemA.id
                        )
                      }
                      title="Switch which copy to keep and which to delete"
                    >
                      ⇄
                    </button>

                    {/* Item B */}
                    <div
                      className={`dup-item-card ${
                        isItemBDelete ? 'state-delete' : 'state-keep'
                      }`}
                      onClick={() =>
                        handleSwapTarget(group.key, idToDelete, group.itemB.id)
                      }
                    >
                      <div className="item-decision-tag">
                        {isItemBDelete ? '🗑️ WILL BE DELETED' : '🛡️ KEEPING'}
                      </div>
                      <div className="dup-item-content">
                        {group.itemB.poster ? (
                          <img
                            src={group.itemB.poster}
                            alt=""
                            className="dup-poster"
                            onError={(e) => (e.target.style.display = 'none')}
                          />
                        ) : (
                          <div className="dup-poster-ph">🖼️</div>
                        )}
                        <div className="dup-details">
                          <span className="dup-id">ID: #{group.itemB.id}</span>
                          <div className="dup-detail-row">
                            <span className="dup-detail-label">Date:</span>
                            <span className="dup-detail-value highlight">
                              {group.itemB.watchedDate || '—'}
                            </span>
                          </div>
                          <div className="dup-detail-row">
                            <span className="dup-detail-label">Status:</span>
                            <span className="dup-detail-value">
                              {group.itemB.status}
                            </span>
                          </div>
                          {group.itemB.venue && (
                            <div className="dup-detail-row">
                              <span className="dup-detail-label">Venue:</span>
                              <span className="dup-detail-value">
                                {group.itemB.venue === 'theatre' ? '🎭 Theatre' : group.itemB.venue}
                              </span>
                            </div>
                          )}
                          {group.itemB.notes && (
                            <div className="dup-detail-row">
                              <span className="dup-detail-label">Notes:</span>
                              <span className="dup-detail-value italic">
                                {group.itemB.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="dup-group-actions">
                    <div className="action-delete-prompt">
                      Deleting: <strong>#{idToDelete}</strong> (Keeping #{isItemADelete ? group.itemB.id : group.itemA.id})
                    </div>
                    <div className="action-buttons-wrap">
                      <button
                        className="btn-dup-delete"
                        onClick={() => handleDeleteGroupDuplicate(group)}
                        disabled={isDeleting}
                      >
                        🗑️ Delete #{idToDelete}
                      </button>

                      {group.isPotentialRewatch && (
                        <button
                          className="btn-dup-rewatch"
                          onClick={() => handleMarkAsRewatch(group)}
                          disabled={isDeleting}
                          title="Keep both copies and mark as an intentional rewatch"
                        >
                          🔄 Mark as Rewatch
                        </button>
                      )}

                      <button
                        className="btn-dup-keep"
                        onClick={() => handleKeepBoth(group.key)}
                        disabled={isDeleting}
                      >
                        Keep Both
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default DuplicateCleanerModal;
