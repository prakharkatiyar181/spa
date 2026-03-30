import React from 'react';

const TherapistHeader = React.memo(({ therapist }) => {
  const genderColor = therapist.gender === 'Female' ? '#EC4899' : '#3B82F6';
  
  return (
    <div className="therapist-header-item" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      borderRight: '1px solid #E5E7EB', 
      height: '60px', 
      padding: '0 10px',
      backgroundColor: '#FFF'
    }}>
      <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>
        {therapist.name}
      </div>
      <div style={{ 
        fontSize: '10px', 
        fontWeight: 700, 
        padding: '2px 8px', 
        borderRadius: '99px', 
        marginTop: '4px', 
        border: `1px solid ${genderColor}`, 
        color: genderColor,
        textTransform: 'uppercase'
      }}>
        {therapist.gender}
      </div>
    </div>
  );
});

export default TherapistHeader;
