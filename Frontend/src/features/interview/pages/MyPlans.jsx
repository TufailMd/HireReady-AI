import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useInterview } from "../hooks/useInterview.js";
import "../style/my-plans.scss";
import Loader from "../../../components/common/Loader";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "high", label: "Strong · 80+" },
  { id: "mid", label: "Good · 60–79" },
  { id: "low", label: "Needs work · <60" },
];

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "score", label: "Highest score" },
];

const TIER_LABEL = {
  high: "Strong match",
  mid: "Good match",
  low: "Needs work",
};

const getTier = (score = 0) => (score >= 80 ? "high" : score >= 60 ? "mid" : "low");

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const timeAgo = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
};

const ScoreRing = ({ score = 0 }) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, score));
  return (
    <span className="plan-ring" aria-hidden="true">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle className="plan-ring__track" cx="32" cy="32" r={radius} />
        <circle
          className="plan-ring__bar"
          cx="32"
          cy="32"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - safe / 100)}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className="plan-ring__value">{score}</span>
    </span>
  );
};

const MyPlans = () => {
  const { loading, error, reports = [], reportsLoaded, getReports } =
    useInterview();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");

  const stats = useMemo(() => {
    if (!reports.length) return { total: 0, avg: 0, best: 0 };
    const scores = reports.map((r) => r.matchScore ?? 0);
    return {
      total: reports.length,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      best: Math.max(...scores),
    };
  }, [reports]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => filter === "all" || getTier(r.matchScore) === filter)
      .filter((r) => !q || (r.title || "Untitled Position").toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "score") return (b.matchScore ?? 0) - (a.matchScore ?? 0);
        const diff = new Date(a.createdAt) - new Date(b.createdAt);
        return sort === "oldest" ? diff : -diff;
      });
  }, [reports, query, filter, sort]);

  const resetFilters = () => {
    setQuery("");
    setFilter("all");
  };

  const handleRetry = async () => {
    if (retrying) return;

    setRetryMessage(
      error.response?.data?.message || error.message || "Please try again.",
    );
    setRetrying(true);
    try {
      await getReports();
    } finally {
      setRetrying(false);
    }
  };

  if (!reportsLoaded || (loading && !retrying)) {
    return (
      <main className="my-plans my-plans--state" aria-live="polite">
        <Loader message="Loading your interview plans..." variant="section" />
      </main>
    );
  }

  if (error || retrying) {
    return (
      <main className="my-plans my-plans--state">
        <section className="my-plans__message" role="alert">
          <h1>We couldn't load your interview plans</h1>
          <p>
            {error?.response?.data?.message ||
              error?.message ||
              retryMessage ||
              "Please try again."}
          </p>
          <button
            type="button"
            className="my-plans__btn"
            onClick={handleRetry}
            disabled={retrying}
            aria-busy={retrying}
          >
            {retrying
              ? <Loader variant="inline" message="Retrying..." />
              : "Try again"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="my-plans">
      <div className="my-plans__inner">

        {/* Top bar */}
        <header className="my-plans__top">
          <div>
            <h1>My Plans</h1>
            <p>Every interview strategy you've generated, in one place.</p>
          </div>
          <Link to="/" className="my-plans__btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New plan
          </Link>
        </header>

        {reports.length === 0 ? (
          <section className="my-plans__empty">
            <span className="my-plans__empty-icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></svg>
            </span>
            <h2>No interview plans yet</h2>
            <p>Paste a job description and add your resume — your first plan takes about 30 seconds.</p>
            <Link to="/" className="my-plans__btn">Create your first plan</Link>
          </section>
        ) : (
          <>
            {/* Stats */}
            <dl className="my-plans__stats">
              <div>
                <dt>Total plans</dt>
                <dd>{stats.total}</dd>
              </div>
              <div>
                <dt>Average match</dt>
                <dd>{stats.avg}<span>%</span></dd>
              </div>
              <div>
                <dt>Best match</dt>
                <dd>{stats.best}<span>%</span></dd>
              </div>
            </dl>

            {/* Toolbar */}
            <div className="my-plans__toolbar">
              <label className="my-plans__search">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by job title"
                  aria-label="Search plans by job title"
                />
              </label>

              <div className="my-plans__chips" role="group" aria-label="Filter by match score">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`my-plans__chip ${filter === f.id ? "my-plans__chip--active" : ""}`}
                    aria-pressed={filter === f.id}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <select
                className="my-plans__sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort plans"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <p className="my-plans__count" aria-live="polite">
              Showing {visible.length} of {reports.length} {reports.length === 1 ? "plan" : "plans"}
            </p>

            {/* Grid */}
            {visible.length > 0 ? (
              <ul className="my-plans__grid">
                {visible.map((report) => {
                  const tier = getTier(report.matchScore);
                  const title = report.title || "Untitled Position";
                  return (
                    <li key={report._id}>
                      <Link
                        to={`/interview/${report._id}`}
                        className={`plan-card plan-card--${tier}`}
                        aria-label={`Open interview plan for ${title}`}
                      >
                        <div className="plan-card__head">
                          <ScoreRing score={report.matchScore ?? 0} />
                          <span className="plan-card__tier">{TIER_LABEL[tier]}</span>
                        </div>
                        <h2 className="plan-card__title">{title}</h2>
                        <p className="plan-card__meta">
                          {formatDate(report.createdAt)} · {timeAgo(report.createdAt)}
                        </p>
                        <span className="plan-card__cta">
                          Open plan <span aria-hidden="true">→</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <section className="my-plans__empty my-plans__empty--small">
                <h2>No plans match your filters</h2>
                <p>Try a different search term or clear the filters.</p>
                <button type="button" className="my-plans__btn my-plans__btn--ghost" onClick={resetFilters}>
                  Clear filters
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default MyPlans;