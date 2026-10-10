/** Names of the measured quantities. The domain layer re-exports these; they live here so `shared` never imports upward. */
export type SensorType = 'temp' | 'hum' | 'press' | 'mq5' | 'mq3' | 'pm25' | 'pm10';

/** Sensors that have a fixed zone scale in SENSOR_RANGES (dust uses the air-quality standard instead). */
export type ScaleSensor = Exclude<SensorType, 'pm25' | 'pm10'>;

/** Badge tone for a reading's status. */
export type MetricTone = 'good' | 'warn' | 'bad' | 'neutral';
