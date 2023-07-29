export function Graph(props: {}) {
    return (
        <div className="graph-layout">
            <div className="status-bar">
                <div className="status-bar-field button-block">
                    <button className="btn-configure">Configure</button>
                    <button className="btn-graph">Show graph</button>
                    <button className="btn-browse">Browse</button>
                    <button className="btn-acquire">
                        <strong>Acquire</strong>
                    </button>
                </div>

                <div className="status-bar-field graph-zoom-buttons">
                    <span>Zoom:</span>
                    <button className="btn-zoom-xy">xy</button>
                    <button className="btn-zoom-x">x</button>
                    <button className="btn-zoom-y">y</button>
                    <button className="btn-zoom-reset">Reset</button>
                </div>
            </div>
            <div className="layout-content">
                <div className="graph-config layout-content-element">
                    <div className="split-pane">
                        <div className="pane-left"></div>
                        <div className="pane-right"></div>
                    </div>
                </div>
                <div className="graph-display layout-content-element">
                    <div className="graph_zone"></div>
                    <div className="legend_zone"></div>
                </div>
                <div className="graph-browser layout-content-element">Nothing to browse for now...</div>
            </div>
        </div>
    )
}
