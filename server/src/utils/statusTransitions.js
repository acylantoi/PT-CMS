/**
 * Valid status transitions for estate files.
 */
const ESTATE_STATUS_TRANSITIONS = {
  INTAKE: ['WAITING_GRANT', 'IN_CONVEYANCING', 'ON_HOLD'],
  WAITING_GRANT: ['IN_CONVEYANCING', 'ON_HOLD'],
  IN_CONVEYANCING: ['PARTIALLY_COMPLETED', 'COMPLETED', 'ON_HOLD'],
  PARTIALLY_COMPLETED: ['IN_CONVEYANCING', 'COMPLETED', 'ON_HOLD'],
  COMPLETED: [],
  ON_HOLD: ['INTAKE', 'WAITING_GRANT', 'IN_CONVEYANCING', 'PARTIALLY_COMPLETED']
};

/**
 * Valid status transitions for assets.
 */
const ASSET_STATUS_TRANSITIONS = {
  PENDING: ['IN_PROGRESS', 'ON_HOLD'],
  IN_PROGRESS: ['SIGNED_SEALED', 'ON_HOLD'],
  SIGNED_SEALED: ['UPLOADED', 'ON_HOLD'],
  UPLOADED: ['COMPLETED', 'ON_HOLD'],
  COMPLETED: [],
  ON_HOLD: ['PENDING', 'IN_PROGRESS', 'SIGNED_SEALED', 'UPLOADED']
};

/**
 * Valid status transitions for transfers.
 */
const TRANSFER_STATUS_TRANSITIONS = {
  DRAFT: ['READY_FOR_SIGN'],
  READY_FOR_SIGN: ['SIGNED_SEALED', 'DRAFT'],
  SIGNED_SEALED: ['UPLOADED', 'READY_FOR_SIGN'],
  UPLOADED: ['RELEASED_TO_CLIENT', 'SIGNED_SEALED'],
  RELEASED_TO_CLIENT: ['COMPLETED', 'UPLOADED'],
  COMPLETED: []
};

const isValidTransition = (transitions, from, to) => {
  if (!transitions[from]) return false;
  return transitions[from].includes(to);
};

module.exports = {
  ESTATE_STATUS_TRANSITIONS,
  ASSET_STATUS_TRANSITIONS,
  TRANSFER_STATUS_TRANSITIONS,
  isValidTransition
};
