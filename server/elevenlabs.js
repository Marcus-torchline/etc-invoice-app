/**
 * ElevenLabs Conversational AI outbound calls (Twilio).
 * Requires: API key (UI or ELEVENLABS_API_KEY), ELEVENLABS_AGENT_ID, ELEVENLABS_PHONE_NUMBER_ID.
 * Configure agent and phone in ElevenLabs dashboard (Conv AI + Twilio).
 */
const ELEVENLABS_OUTBOUND_URL = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';

export async function startOutboundCall({ apiKey, agentId, agentPhoneNumberId, toNumber }) {
  const key = (apiKey || process.env.ELEVENLABS_API_KEY || '').trim();
  if (!key) throw new Error('ElevenLabs API key not set. Add it in Settings or set ELEVENLABS_API_KEY in .env');
  const agent = (agentId || process.env.ELEVENLABS_AGENT_ID || '').trim();
  const phoneId = (agentPhoneNumberId || process.env.ELEVENLABS_PHONE_NUMBER_ID || '').trim();
  if (!agent) throw new Error('ElevenLabs Agent ID not set. Set ELEVENLABS_AGENT_ID in .env and create an agent in ElevenLabs.');
  if (!phoneId) throw new Error('ElevenLabs Phone Number ID not set. Set ELEVENLABS_PHONE_NUMBER_ID in .env and link a number in ElevenLabs.');
  const to = String(toNumber || '').replace(/\D/g, '');
  if (to.length < 10) throw new Error('A valid customer phone number is required (e.g. +1234567890).');

  const res = await fetch(ELEVENLABS_OUTBOUND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': key,
    },
    body: JSON.stringify({
      agent_id: agent,
      agent_phone_number_id: phoneId,
      to_number: to.startsWith('+') ? to : `+${to}`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `ElevenLabs error ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j.detail?.message) msg = j.detail.message;
      else if (j.message) msg = j.message;
    } catch (_) {
      if (text) msg += `: ${text.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  const data = await res.json().catch(() => ({}));
  return data;
}
