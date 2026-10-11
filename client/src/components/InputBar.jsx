export default function InputBar({ value, onChange, onSend, disabled, loading, resolved }) {
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
        placeholder={resolved ? 'Order accepted. Restart to play again.' : loading ? 'Sending your response…' : 'Reply to Gerald…'}
        disabled={disabled}
      />
      <button type="submit" className="primary-button" disabled={disabled || !value.trim()}>{loading ? 'Sending…' : 'Send'}</button>
    </form>
  );
}
