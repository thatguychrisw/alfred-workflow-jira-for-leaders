import alfy from 'alfy'
import makeJiraService from '../services/jira'
import { getEnv, getJiraCredentials } from '../helpers'

/**
 * @param {{title: string}, {url: string}, {status: object}, {assignee: object}} issue
 * @returns {{mods: {alt: {subtitle: string}}, subtitle: *, arg: *, title: string}}
 */
const mapIssueToAlfyOutput = (issue) => ({
      title: issue.title,
      subtitle: `Assigned to ${issue.assignee.displayName}`,
      arg: issue.url,
      mods: {
          alt: {
              subtitle: issue.url
          },
          ctrl: {
              subtitle: `${issue.status.name}`
          }
      }
  })

;(async () => {
    const service = makeJiraService(...getJiraCredentials())

    const teamMembers = getEnv('jira_team_members')
    if (!teamMembers) {
        return alfy.output([{title: 'Please add team members first', valid: false}])
    }

    let issues = alfy.cache.get('team-wip')
    if (!issues) {
        const members = await service.getUserAccountIds(teamMembers.split(','))

        if (members) {
            const criteria = `
            sprint in openSprints() and 
            status not in ("To Do", "Pending Release", "Done") and
            assignee IN (${Object.values(members).join(',')})`

            issues = await service.getIssues(criteria, ['summary', 'key', 'assignee', 'status'])

            alfy.cache.set('team-wip', issues, {maxAge: getEnv('team_wip_ttl') || 0})
        }
    }

    return alfy.output(issues.length > 0 ? issues.map(mapIssueToAlfyOutput) : [{
        title: 'There is no work in progress',
        subtitle: 'ESC to hide',
        valid: false
    }])
})()
