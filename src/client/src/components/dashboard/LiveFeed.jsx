import React from 'react';

export default function LiveFeed({ events = [], connected = false }) {
  return (
    <section className="card live-feed">
      <div className="card-header">
        <div className="card-title">
          <span>📡 Telemetry Stream</span>
        </div>
        <span className={connected ? 'target-badge' : 'pill low'}>
          {connected && <span className="pulse-dot"></span>}
          {connected ? 'SSH Connected' : 'Connecting...'}
        </span>
      </div>

      <div className="feed-ticker">
        {events.length === 0 ? (
          <div className="feed-item">
            <div className="feed-time">{new Date().toLocaleTimeString()} — telemetry</div>
            <div className="feed-text">SSH stream active. Waiting for error log events...</div>
          </div>
        ) : (
          events.map((item) => (
            <div className="feed-item" key={item.key || Math.random()}>
              <div className="feed-time">
                {new Date(item.timestamp || Date.now()).toLocaleTimeString()} — {item.event}
              </div>
              <div className="feed-text">
                {item.payload?.title || item.payload?.normalizedMessage || JSON.stringify(item.payload)}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
