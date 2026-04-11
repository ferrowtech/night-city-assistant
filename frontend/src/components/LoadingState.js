export function LoadingState({ loadingText }) {
  return (
    <div className="loading-container" data-testid="loading-indicator">
      <div className="loading-bar" />
      <p className="font-['JetBrains_Mono'] text-sm text-[#FF003C] animate-pulse">{loadingText}</p>
      <div className="loading-dots"><span /><span /><span /></div>
    </div>
  );
}
