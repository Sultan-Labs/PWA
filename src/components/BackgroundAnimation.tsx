
import './BackgroundAnimation.css';

export default function BackgroundAnimation({ showLines = true }: { showLines?: boolean }) {
  return (
    <div className="background-animation">
      {showLines && (
        <div className="floating-lines">
          <div className="floating-line"></div>
          <div className="floating-line"></div>
          <div className="floating-line"></div>
          <div className="floating-line"></div>
          <div className="floating-line"></div>
          <div className="floating-line"></div>
        </div>
      )}
    </div>
  );
}
