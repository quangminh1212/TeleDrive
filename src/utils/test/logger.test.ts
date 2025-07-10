import logger from '../logger';

describe('Logger Module', () => {
  it('should export a logger object', () => {
    expect(logger).toBeDefined();
  });

  it('should have standard logging methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
}); 