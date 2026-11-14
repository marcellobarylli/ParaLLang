export default function InputBar({ value, onChange, onSend, disabled, loading, name = 'them' }) {
  const submit = (event) => {
    event.preventDefault();
    if (!disabled && value.trim()) onSend(value);
  };
  return (
    <form className="input-bar" onSubmit={submit}>
      <label className="sr-only" htmlFor="player-response">Your response</label>
      <input
        id="player-response"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={loading ? 'Sending your response…' : `Reply to ${name}…`}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="send"
      />
      <button type="submit" className="primary-button" disabled={disabled || !value.trim()}>{loading ? 'Sending…' : 'Send'}</button>
    </form>
  );
}
