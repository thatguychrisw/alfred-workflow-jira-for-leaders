import alfy from 'alfy'
import makeJiraService from '../services/jira'
import { getEnv, getJiraCredentials, replaceAlfredVars } from '../helpers'

/**
 * @param {{title: string}, {url: string}, {status: object}, {assignee: object}} member
 * @returns {{mods: {alt: {subtitle: string}}, subtitle: *, arg: *, title: string}}
 */
const actionUrl = replaceAlfredVars(getEnv('team_unassigned_url'))

const mapMemberToAlfredOutput = (member) => ({
      title: `${member.title} is not assigned to a task`,
      subtitle: !!actionUrl ? `Review available work` : 'ESC to hide; hint: you can assign a url to open instead in alfred',
      arg: actionUrl || '',
      valid: !!actionUrl,
  })

;(async () => {
    const service = makeJiraService(...getJiraCredentials())

    const teamMembers = getEnv('jira_team_members')
    if (!teamMembers) {
        return alfy.output([{title: 'Please add team members first', valid: false}])
    }

    let unassignedMembers = alfy.cache.get('team-unassigned')
    if (!unassignedMembers) {
        const members = await service.getUserAccountIds(teamMembers.split(','))

        if (members) {
            const criteria = `
            sprint in openSprints() and 
            status not in ("To Do", "Done") and
            assignee IN (${Object.values(members).join(',')})`

            const issues = await service.getIssues(criteria, ['summary', 'key', 'assignee'])

            const assignedMembers = issues.reduce((members, issue) => {
                const assigneeEmailAddress = issue.assignee.emailAddress

                if (!members.includes(assigneeEmailAddress)) {
                    members.push(assigneeEmailAddress)
                }

                return members
            }, [])

            unassignedMembers = teamMembers.split(',')
              .filter(emailAddress => !assignedMembers.includes(emailAddress))
              .map(member => ({
                  title: member
              }))

            alfy.cache.set('team-unassigned', unassignedMembers, {maxAge: getEnv('team_unassigned_ttl') * 60000 || 0})
        }
    }

    return alfy.output(unassignedMembers.length > 0 ? unassignedMembers.map(mapMemberToAlfredOutput) : [{
        title: 'There is no unassigned work',
        subtitle: 'ESC to hide',
        valid: false
    }])
})()
