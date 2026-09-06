/**
 * Regression tests for the P0 configuration defects.
 */
import { resolveApiUrl, ApiConfigurationError } from '@/constants/config';
import { API } from '@/constants/config';

describe('resolveApiUrl', () => {
  it('rejects a missing URL instead of falling back to an emulator address', () => {
    expect(() => resolveApiUrl(undefined, { development: false })).toThrow(ApiConfigurationError);
    expect(() => resolveApiUrl('', { development: true })).toThrow(ApiConfigurationError);
  });

  it('rejects cleartext and private hosts in production', () => {
    for (const url of [
      'http://10.0.2.2:8000/api/v1',
      'http://localhost:8000/api/v1',
      'http://127.0.0.1:8000/api/v1',
      'https://192.168.1.10/api/v1',
      'https://172.16.4.4/api/v1',
      'http://api.example.com/api/v1',
    ]) {
      expect(() => resolveApiUrl(url, { development: false })).toThrow(ApiConfigurationError);
    }
  });

  it('accepts a public HTTPS URL in production', () => {
    expect(resolveApiUrl('https://api.example.com/api/v1', { development: false })).toBe(
      'https://api.example.com/api/v1',
    );
  });

  it('allows the emulator loopback only in development', () => {
    expect(resolveApiUrl('http://10.0.2.2:8000/api/v1', { development: true })).toBe(
      'http://10.0.2.2:8000/api/v1',
    );
  });
});

describe('API route contract', () => {
  it('uses the unified research job paths', () => {
    expect(API.research.createJob).toBe('/research/jobs');
    expect(API.research.job('abc')).toBe('/research/jobs/abc');
    expect(API.research.cancel('abc')).toBe('/research/jobs/abc/cancel');
    expect(API.research.events('abc')).toBe('/research/jobs/abc/events');
  });

  it('exposes the topic study-pack job paths', () => {
    expect(API.studypack.createJob).toBe('/studypack/jobs');
    expect(API.studypack.retry('t1')).toBe('/studypack/jobs/t1/retry');
  });
});
