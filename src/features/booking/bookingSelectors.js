import { createSelector } from '@reduxjs/toolkit';
import { parseISO, getHours, getMinutes } from 'date-fns';

const PIXELS_PER_MINUTE = 1;

const selectBookingById = state => state.booking.byId;
const selectBookingAllIds = state => state.booking.allIds;

/**
 * PRODUCTION OVERLAP ENGINE: 
 * - Uses Date objects for all comparisons (Fix 3)
 * - Implements robust lane-based layout with dynamic splitting (Fix 5)
 */
export const selectBookingsByTherapist = createSelector(
  [selectBookingById, selectBookingAllIds, (state, therapistId) => therapistId],
  (byId, allIds, therapistId) => {
    // 1. Strict filtering and sorting using Date objects
    const therapistEvents = allIds
      .map(id => byId[id])
      .filter(b => b.therapistId === (therapistId || "unassigned"))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const results = [];
    const collisionClusters = [];

    // 2. Identify collision clusters (groups of overlapping bookings)
    therapistEvents.forEach(booking => {
      const start = new Date(booking.startTime).getTime();
      const end = new Date(booking.endTime).getTime();
      
      let cluster = collisionClusters.find(c => start < c.maxEnd);
      
      if (!cluster) {
        cluster = { events: [], maxEnd: end };
        collisionClusters.push(cluster);
      }
      
      cluster.events.push(booking);
      if (end > cluster.maxEnd) cluster.maxEnd = end;
    });

    // 3. Process each cluster into lanes for dynamic width splitting
    collisionClusters.forEach(cluster => {
      const lanes = [];
      
      cluster.events.forEach(booking => {
        const start = new Date(booking.startTime).getTime();
        const end = new Date(booking.endTime).getTime();
        
        // Find first lane where booking fits
        let laneIndex = lanes.findIndex(laneEnd => start >= laneEnd);
        
        if (laneIndex === -1) {
          lanes.push(end);
          laneIndex = lanes.length - 1;
        } else {
          lanes[laneIndex] = end;
        }

        const date = parseISO(booking.startTime);
        const top = (getHours(date) * 60 + getMinutes(date)) * PIXELS_PER_MINUTE;

        results.push({
          ...booking,
          top,
          height: booking.duration * PIXELS_PER_MINUTE,
          laneIndex,
          clusterLanes: 0 // placeholder
        });
      });

      // Update all events in cluster with total width info
      const eventsInCluster = results.filter(r => cluster.events.some(e => e.id === r.id));
      eventsInCluster.forEach(ev => {
        ev.clusterLanes = lanes.length;
        ev.width = `${100 / lanes.length}%`;
        ev.left = `${(100 / lanes.length) * ev.laneIndex}%`;
      });
    });

    return results;
  }
);
