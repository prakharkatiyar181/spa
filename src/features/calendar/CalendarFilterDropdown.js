import React from 'react';

const CalendarFilterDropdown = ({
  rooms,
  statusOptions,
  therapists,
  filters,
  therapistSearch,
  onTherapistSearchChange,
  onToggleOnDuty,
  onSetGenderFilter,
  onToggleRoom,
  onToggleStatus,
  onToggleTherapist,
  onToggleAllTherapists,
  allTherapistsSelected,
  onClear,
}) => {
  const filteredTherapists = therapists.filter((therapist) =>
    therapist.name.toLowerCase().includes(therapistSearch.toLowerCase())
  );

  return (
    <div className="calendar-filter-dropdown">
      <section className="calendar-filter-dropdown__section">
        <div className="calendar-filter-dropdown__sectionHeader">
          <span>Show by group (Person who is on duty)</span>
          <button
            type="button"
            className={`calendar-filter-dropdown__toggle ${filters.showOnDutyOnly ? 'is-active' : ''}`}
            onClick={onToggleOnDuty}
            aria-pressed={filters.showOnDutyOnly}
          >
            <span className="calendar-filter-dropdown__toggleThumb" />
          </button>
        </div>

        <div className="calendar-filter-dropdown__radioList">
          <button
            type="button"
            className={`calendar-filter-dropdown__radioOption ${filters.genderFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => onSetGenderFilter('all')}
          >
            <span>All Therapist</span>
            <span className="calendar-filter-dropdown__radioDot" />
          </button>
          <button
            type="button"
            className={`calendar-filter-dropdown__radioOption ${filters.genderFilter === 'male' ? 'is-active' : ''}`}
            onClick={() => onSetGenderFilter('male')}
          >
            <span>Male</span>
          </button>
          <button
            type="button"
            className={`calendar-filter-dropdown__radioOption ${filters.genderFilter === 'female' ? 'is-active' : ''}`}
            onClick={() => onSetGenderFilter('female')}
          >
            <span>Female</span>
          </button>
        </div>
      </section>

      <section className="calendar-filter-dropdown__section">
        <div className="calendar-filter-dropdown__sectionTitle">Resources</div>
        <div className="calendar-filter-dropdown__checkList">
          {rooms.length ? (
            rooms.map((room) => (
              <label key={room.id} className="calendar-filter-dropdown__checkItem">
                <input
                  type="checkbox"
                  checked={filters.selectedRoomIds === null || filters.selectedRoomIds.includes(String(room.id))}
                  onChange={() => onToggleRoom(String(room.id))}
                />
                <span>{room.room_name || room.name || `Room ${room.id}`}</span>
              </label>
            ))
          ) : (
            <div className="calendar-filter-dropdown__empty">No resources available</div>
          )}
        </div>
      </section>

      <section className="calendar-filter-dropdown__section">
        <div className="calendar-filter-dropdown__sectionTitle">Booking Status</div>
        <div className="calendar-filter-dropdown__statusGrid">
          {statusOptions.map((status) => (
            <label key={status.key} className="calendar-filter-dropdown__statusItem">
              <input
                type="checkbox"
                checked={filters.selectedStatuses[status.key]}
                onChange={() => onToggleStatus(status.key)}
              />
              <span className="calendar-filter-dropdown__statusLabel">{status.label}</span>
              <span
                className="calendar-filter-dropdown__statusSwatch"
                style={{ backgroundColor: status.color }}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="calendar-filter-dropdown__section">
        <div className="calendar-filter-dropdown__sectionHeader">
          <span className="calendar-filter-dropdown__sectionTitle">Select Therapist</span>
          <label className="calendar-filter-dropdown__selectAll">
            <span>Select All</span>
            <input
              type="checkbox"
              checked={allTherapistsSelected}
              onChange={onToggleAllTherapists}
            />
          </label>
        </div>

        <input
          type="search"
          className="calendar-filter-dropdown__search"
          placeholder="Search by therapist"
          value={therapistSearch}
          onChange={(event) => onTherapistSearchChange(event.target.value)}
        />

        <div className="calendar-filter-dropdown__therapistList">
          {filteredTherapists.length ? (
            filteredTherapists.map((therapist) => (
              <label key={therapist.id} className="calendar-filter-dropdown__therapistItem">
                <input
                  type="checkbox"
                  checked={
                    filters.selectedTherapistIds === null ||
                    filters.selectedTherapistIds.includes(therapist.id)
                  }
                  onChange={() => onToggleTherapist(therapist.id)}
                />
                <span>{therapist.name}</span>
                <span className="calendar-filter-dropdown__therapistMeta">{therapist.gender}</span>
              </label>
            ))
          ) : (
            <div className="calendar-filter-dropdown__empty">No therapists match this search</div>
          )}
        </div>
      </section>

      <button type="button" className="calendar-filter-dropdown__clear" onClick={onClear}>
        Clear Filter (Return to Default)
      </button>
    </div>
  );
};

export default CalendarFilterDropdown;
