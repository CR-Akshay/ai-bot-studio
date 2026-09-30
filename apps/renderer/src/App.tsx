import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { LayoutDashboard, Bot, BriefcaseBusiness, Workflow, Settings, LogIn, UserPlus } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Bots', path: '/bots', icon: Bot },
  { label: 'Projects', path: '/projects', icon: BriefcaseBusiness },
  { label: 'Workflow', path: '/workflow', icon: Workflow },
  { label: 'Settings', path: '/settings', icon: Settings }
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AI</div>
          <div>
            <strong>AI Bot Studio</strong>
            <small>Desktop workspace</small>
          </div>
        </div>

        <nav className="nav">
          {navItems.map(({ label, path, icon: Icon }) => (
            <Link key={path} to={path} className="nav-item">
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main-panel">{children}</main>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
        </div>
      </header>

      <div className="stats-grid">
        <StatCard title="Bots" value="18" helper="Created this month" />
        <StatCard title="Projects" value="7" helper="Across active workstreams" />
        <StatCard title="Workflows" value="12" helper="Live orchestration paths" />
        <StatCard title="Providers" value="3" helper="OpenAI, Anthropic, Gemini" />
      </div>
    </div>
  );
}

function BotPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Creator</p>
          <h1>Bots</h1>
        </div>
      </header>

      <div className="card-grid">
        <div className="panel">
          <h3>Create a bot</h3>
          <label>
            Name
            <input defaultValue="Market Analyst" />
          </label>
          <label>
            Prompt
            <textarea rows={5} defaultValue="Analyze buyer sentiment and prioritize campaign recommendations." />
          </label>
          <label>
            Provider
            <select defaultValue="openai">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
          <button className="primary-button">Save bot</button>
        </div>

        <div className="panel">
          <h3>Bot library</h3>
          <div className="list-stack">
            <BotItem name="Customer Voice Bot" provider="OpenAI" />
            <BotItem name="Research Agent" provider="Gemini" />
            <BotItem name="Ops Sustain Bot" provider="Anthropic" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Projects</h1>
        </div>
      </header>

      <div className="panel">
        <div className="project-list">
          <ProjectCard name="Spring Launch" description="Campaign planning, content synthesis, and outreach sequencing." />
          <ProjectCard name="Onboarding Flow" description="Support bots for triage, enablement, and lifecycle messages." />
        </div>
      </div>
    </div>
  );
}

function WorkflowPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Automation</p>
          <h1>Workflow Builder</h1>
        </div>
      </header>

      <div className="panel workflow-panel">
        <div className="flow-node">Input Bot</div>
        <div className="flow-arrow">→</div>
        <div className="flow-node">Summarizer</div>
        <div className="flow-arrow">→</div>
        <div className="flow-node">Publisher</div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
        </div>
      </header>

      <div className="panel settings-grid">
        <div>
          <h3>Provider keys</h3>
          <label>OpenAI <input defaultValue="sk-..." /></label>
          <label>Anthropic <input defaultValue="ant-..." /></label>
          <label>Gemini <input defaultValue="AIza..." /></label>
        </div>
        <div>
          <h3>Project defaults</h3>
          <label>Default model <input defaultValue="gpt-4o-mini" /></label>
          <label>Output folder <input defaultValue="./exports" /></label>
          <button className="primary-button">Save settings</button>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Welcome</p>
        <h1>AI Bot Studio</h1>
        <div className="auth-actions">
          <button className="primary-button"><LogIn size={16} /> Sign in</button>
          <button className="secondary-button"><UserPlus size={16} /> Create account</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="panel stat-card">
      <small>{title}</small>
      <strong>{value}</strong>
      <span>{helper}</span>
    </div>
  );
}

function BotItem({ name, provider }: { name: string; provider: string }) {
  return (
    <div className="list-item">
      <div>
        <strong>{name}</strong>
        <small>{provider}</small>
      </div>
      <button className="secondary-button">Open</button>
    </div>
  );
}

function ProjectCard({ name, description }: { name: string; description: string }) {
  return (
    <div className="project-card">
      <div>
        <strong>{name}</strong>
        <p>{description}</p>
      </div>
      <button className="secondary-button">View</button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Shell>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bots" element={<BotPage />} />
              <Route path="/projects" element={<ProjectPage />} />
              <Route path="/workflow" element={<WorkflowPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Shell>
        }
      />
    </Routes>
  );
}
