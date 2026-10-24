import "./app.css";

export function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">Choose an area to get started.</p>
      <div className="tiles">
        <a href="#/items" className="tile">
          <span className="tile-icon" aria-hidden="true">
            ☰
          </span>
          <h2>Items</h2>
          <p className="muted">Add new items and view the list.</p>
        </a>
      </div>
    </>
  );
}
