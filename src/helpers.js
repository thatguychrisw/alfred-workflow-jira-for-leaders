export const getEnv = (name) => process.env[name] || null
export const getJiraCredentials = () => ['jira_host', 'jira_username', 'jira_password'].map(x => getEnv(x))
export const isJiraIssueKey = (string) => string.match(/[a-zA-z]{2}-\d+/)
export const replaceAlfredVars = (string) => string.replace(/{var:(\w+)}/ig, (_, variable) => getEnv(variable) || "")
