const ORDER_STATES = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED'
};

// Define strictly linear allowed transitions (from -> to)
const ALLOWED_TRANSITIONS = {
  [ORDER_STATES.PENDING]: [ORDER_STATES.PAID],
  [ORDER_STATES.PAID]: [ORDER_STATES.PREPARING],
  [ORDER_STATES.PREPARING]: [ORDER_STATES.OUT_FOR_DELIVERY],
  [ORDER_STATES.OUT_FOR_DELIVERY]: [ORDER_STATES.DELIVERED],
  [ORDER_STATES.DELIVERED]: []
};

/**
 * Transitions an order to a new state securely.
 * @param {Object} order - The order object to mutate
 * @param {string} newState - The desired new state
 * @throws {Error} If the transition is invalid
 */
const transitionOrderState = (order, newState) => {
  if (!Object.values(ORDER_STATES).includes(newState)) {
    throw new Error(`Invalid state: ${newState}`);
  }

  const currentState = order.status || ORDER_STATES.PENDING;
  const allowedNextStates = ALLOWED_TRANSITIONS[currentState] || [];

  if (!allowedNextStates.includes(newState)) {
    throw new Error(`Invalid state transition from ${currentState} to ${newState}`);
  }

  // Perform transition
  order.status = newState;
  order.updatedAt = new Date();
  
  return order;
};

module.exports = {
  ORDER_STATES,
  transitionOrderState
};
