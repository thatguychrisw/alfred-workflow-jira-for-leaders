import alfy from 'alfy'
import moment from 'moment-business-days'
import makeJiraService from '../services/jira'
import { getEnv, getJiraCredentials } from '../helpers'

/**
 * @param {{title: string}, {url: string}, {status: object}, {daysStale: number}, {assignee: object}} issue
 */
const mapIssueToAlfyOutput = (issue) => ({
      title: issue.title,
      subtitle: `${issue.daysStale} days without an update`,
      arg: issue.url,
      mods: {
          alt: {
              subtitle: `Assigned to ${issue.assignee.displayName}`,
          },
          ctrl: {
              subtitle: `${issue.status.name}`
          },
          shift: {
              subtitle: `${issue.url}`
          }
      }
  })

;(async () => {
    const service = makeJiraService(...getJiraCredentials())

    const teamMembers = getEnv('jira_team_members')
    if (!teamMembers) {
        return alfy.output([{title: 'Please add team members first', valid: false}])
    }

    let issues = alfy.cache.get('team-churn')
    if (!issues) {
        const members = await service.getUserAccountIds(teamMembers.split(','))

        if (members) {
            const daysConsideredChurn = getEnv('churn_days')

            /**
             * @todo these status will need to be custom for a broader release
             * @internal consider a csv of statuses and dynamically create each condition
             */
            const criteria = `
            (
                (status = "In Progress" AND status changed to "In Progress" before -${daysConsideredChurn}d) OR 
                (status = "Pending Release" AND status changed to "Pending Release" before -${daysConsideredChurn}d) OR 
                (status = "Code Review" AND status changed to "Code Review" before -${daysConsideredChurn}d)
            ) AND 
            assignee IN (${Object.values(members).join(',')}) AND
            Sprint in openSprints() 
            ORDER BY status DESC, statusCategoryChangedDate ASC`

            issues = await service.getIssues(criteria, ['summary', 'key', 'assignee', 'status', 'statuscategorychangedate'])

            issues = issues.map(issue => {
                issue['daysStale'] = moment().businessDiff(moment(issue.statuscategorychangedate))

                return issue
            }).filter(issue => issue.daysStale > daysConsideredChurn)

            alfy.cache.set('team-churn', issues, {maxAge: (getEnv('team_churn_ttl') * 60000) || 0})
        }
    }

    return alfy.output(issues.length > 0 ? issues.map(mapIssueToAlfyOutput) : [{
        title: 'There is no work churning',
        subtitle: 'ESC to hide',
        valid: false
    }])
})()
