import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout title="Welcome" description="MeetPlanner documentation — turn every meeting into action.">

      {/* Hero */}
      <div className="hero-section">
        <h1 className="hero-title">MeetPlanner Docs</h1>
        <p className="hero-subtitle">
          Everything you need to turn meetings into structured action. Step-by-step guides for every role.
        </p>
        <div className="hero-buttons">
          <Link className="button--primary-custom" to="/docs/intro">
            Get Started
          </Link>
          <Link className="button--secondary-custom" to="/docs/reference/permissions">
            Role Permissions
          </Link>
        </div>
      </div>

      {/* Role cards */}
      <div className="section-header">
        <h2>Start by your role</h2>
        <p>Jump straight to the features that apply to you.</p>
      </div>

      <div className="role-cards">
        <Link className="role-card" to="/docs/guide/settings">
          <span className="role-card-icon">🔑</span>
          <div className="role-card-title">Admin</div>
          <div className="role-card-desc">
            Manage team members, departments, automations, and all system settings.
          </div>
        </Link>

        <Link className="role-card" to="/docs/guide/triage">
          <span className="role-card-icon">✅</span>
          <div className="role-card-title">Manager</div>
          <div className="role-card-desc">
            Review AI-extracted tasks, approve meeting requests, and oversee team workload.
          </div>
        </Link>

        <Link className="role-card" to="/docs/guide/tasks">
          <span className="role-card-icon">📋</span>
          <div className="role-card-title">Member</div>
          <div className="role-card-desc">
            Work through your tasks, submit meeting notes, and collaborate in channels.
          </div>
        </Link>

        <Link className="role-card" to="/docs/guide/analytics">
          <span className="role-card-icon">📊</span>
          <div className="role-card-title">Viewer</div>
          <div className="role-card-desc">
            Read-only access to tasks, meetings, goals, and analytics dashboards.
          </div>
        </Link>
      </div>

      {/* Feature overview */}
      <div className="section-header">
        <h2>What's in MeetPlanner</h2>
        <p>A full suite of tools from meeting capture to project delivery.</p>
      </div>

      <div className="features-grid">
        <div className="feature-item">
          <div className="feature-item-title">AI Meeting Extraction</div>
          <div className="feature-item-desc">Paste notes, upload files, or connect Gmail. AI pulls out tasks, decisions, and attendees automatically.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Task Board</div>
          <div className="feature-item-desc">Five-column Kanban with subtasks, dependencies, milestones, time tracking, and goal links.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Triage Queue</div>
          <div className="feature-item-desc">Managers review AI-extracted tasks before they appear on the team board — no noise.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Projects</div>
          <div className="feature-item-desc">Portfolio view, sprints, budgets, documents, risk tracking, and project automations.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Messaging</div>
          <div className="feature-item-desc">Department channels, DMs, and one-click chat-to-task conversion with AI extraction.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Goals & OKRs</div>
          <div className="feature-item-desc">Company, team, and individual goals with Key Results and direct task linkage.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Analytics</div>
          <div className="feature-item-desc">Burndown, velocity, cycle time, workload charts, and AI-generated insights.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Timesheets</div>
          <div className="feature-item-desc">Log time per task, use the live timer, set hourly rates, and generate billing reports.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Client Portals</div>
          <div className="feature-item-desc">Share project status, milestones, and documents with clients via a branded public portal.</div>
        </div>
        <div className="feature-item">
          <div className="feature-item-title">Intake Forms</div>
          <div className="feature-item-desc">Collect requests from external users via shareable public forms that route into Triage.</div>
        </div>
      </div>

    </Layout>
  );
}
