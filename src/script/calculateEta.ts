// utils/calculateEta.ts

type DeliveryType = 'Priority' | 'Regular' | 'Polling';

interface EtaResult {
  eta: Date;
  etaInMinutes: number;
}

const SPEEDS: Record<DeliveryType, number> = {
  Priority: 60, // km/h
  Regular: 40,
  Polling: 30,
};

const DELAYS: Record<DeliveryType, number> = {
  Priority: 0,  // mins
  Regular: 0,
  Polling: 5,
};

export function calculateEta(distanceKm: number, type: DeliveryType): EtaResult {
  if (!SPEEDS[type]) {
    throw new Error(`Invalid delivery type: ${type}`);
  }

  const speed = SPEEDS[type];
  const delay = DELAYS[type];

  const travelMinutes = (distanceKm / speed) * 60;
  const totalEtaMinutes = travelMinutes + delay;
  const eta = new Date(Date.now() + totalEtaMinutes * 60_000);

  return {
    eta,
    etaInMinutes: Math.round(totalEtaMinutes),
  };
}

export function convertMinutesToHours(totalMinutes) {
    // Validate input
    if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) {
        throw new Error('Input must be a number');
    }
    
    if (totalMinutes < 0) {
        throw new Error('Input must be a non-negative number');
    }
    
    if (!Number.isInteger(totalMinutes)) {
        throw new Error('Input must be an integer');
    }
    
    // Convert to hours and minutes
    if (totalMinutes < 60) {
        return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
    } else {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        let result = `${hours} hour${hours !== 1 ? 's' : ''}`;
        
        if (minutes > 0) {
            result += ` ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        
        return result;
    }
}


export function getInitials(name) {
  if (typeof name !== 'string') return '';
  
  const words = name.trim().split(/\s+/);
  const firstInitial = words[0]?.[0] || '';
  const secondInitial = words[1]?.[0] || '';
  
  return `${firstInitial}${secondInitial}`.toUpperCase();
}
