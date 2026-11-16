import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { artUrl } from '../art';

function host() {
  return document.querySelector('.phone') ?? document.body;
}

/** 金盆洗手: one illustration, then "…but nobody stays retired." */
export function CashOutCeremony({ face, onClose }: { face: number; onClose: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1600);
    const t2 = setTimeout(() => setStep(2), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const art = artUrl('key', 'cash_out');
  return createPortal(
    <div className="ceremony" role="dialog" aria-modal="true" aria-label="Cash out">
      <div className="ceremony-art" aria-hidden>
        {art ? (
          <img src={art} alt="" />
        ) : (
          <div className="basin">
            <div className="basin-smoke">
              <i />
              <i />
              <i />
            </div>
            <div className="basin-bowl" />
            <div className="basin-table" />
          </div>
        )}
      </div>
      <div className="ceremony-text">
        <h2 className="zh">金盆洗手</h2>
        <p>You wash your hands in the golden basin and retire.</p>
        <p className="ceremony-face">
          <span className="zh">面</span> +{face} Face
        </p>
        {step >= 1 && <p className="ceremony-but">…but nobody stays retired.</p>}
        {step >= 2 && (
          <button className="btn" onClick={onClose}>
            Back to work
          </button>
        )}
      </div>
    </div>,
    host(),
  );
}

/** Claiming Xinyi tops out Taipei 101: New Year's Eve 2004 fireworks. */
export function Fireworks({ full, onClose }: { full: boolean; onClose: () => void }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), full ? 6000 : 2500);
    return () => clearTimeout(t);
  }, [full]);
  const art = artUrl('key', 'fireworks');
  const bursts = Array.from({ length: full ? 14 : 6 }, (_, i) => i);
  const colors = ['#ff3ea5', '#ffd34d', '#2ef0ff', '#2bb673', '#ff5a3c'];
  return createPortal(
    <div className="fireworks" role="dialog" aria-modal="true" aria-label="Happy New Year 2005">
      {art && <img className="fireworks-art" src={art} alt="" />}
      <div className="sky" aria-hidden>
        {bursts.map((i) => (
          <span
            key={i}
            className="burst"
            style={{
              left: `${10 + ((i * 37) % 80)}%`,
              top: `${8 + ((i * 23) % 40)}%`,
              animationDelay: `${(i * (full ? 0.38 : 0.3)).toFixed(2)}s`,
              ['--c' as string]: colors[i % colors.length],
            }}
          />
        ))}
        {!art && (
          <div className="tower">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        )}
      </div>
      <div className="fireworks-text">
        <span className="countdown">2004 → 2005</span>
        <h2>
          新年快樂 <small>Happy New Year!</small>
        </h2>
        <p>{full ? 'Taipei 101 tops out over the city. Xinyi is yours, and Chapter 1 is complete.' : 'Xinyi is yours again. The fireworks never get old.'}</p>
        {done && (
          <button className="btn" onClick={onClose}>
            Continue
          </button>
        )}
      </div>
    </div>,
    host(),
  );
}
