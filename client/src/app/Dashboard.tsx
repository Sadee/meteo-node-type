import "./app.css";

export function Dashboard({ isDirector }: { isDirector: boolean }) {
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
        <a href="#/sites" className="tile">
          <span className="tile-icon" aria-hidden="true">
            ⚑
          </span>
          <h2>Sites</h2>
          <p className="muted">
            {isDirector ? "Add, edit and remove manufacturing sites." : "View the sites you manage."}
          </p>
        </a>
        {isDirector && (
          <a href="#/managers" className="tile">
            <span className="tile-icon" aria-hidden="true">
              ☺
            </span>
            <h2>Managers</h2>
            <p className="muted">Create manager accounts for your sites.</p>
          </a>
        )}
      </div>
    </>
  );
}
