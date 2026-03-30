import React from 'react';

const TherapistHeader = React.memo(({ therapist, index }) => {
  const genderClass = therapist.gender === 'Female' ? 'is-female' : therapist.gender === 'Male' ? 'is-male' : 'is-neutral';

  return (
    <div className="therapist-header-item">
      <span className={`therapist-header-item__badge ${genderClass}`}>{index + 1}</span>
      <div className="therapist-header-item__copy">
        <div className="therapist-header-item__name">{therapist.name}</div>
        <div className={`therapist-header-item__meta ${genderClass}`}>{therapist.gender}</div>
      </div>
    </div>
  );
});

export default TherapistHeader;
