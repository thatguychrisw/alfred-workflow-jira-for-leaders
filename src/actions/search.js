import alfy from 'alfy'
import makeJiraService from '../services/jira'
import { getEnv, getJiraCredentials, isJiraIssueKey } from '../helpers'

/**
 * @param {{title: string}, {url: string}, {status: object}, {assignee: object}} issue
 * @returns {{mods: {alt: {subtitle: string}}, subtitle: *, arg: *, title: string}}
 */
const mapIssueToAlfyOutput = (issue) => ({
      title: issue.title,
      subtitle: issue.url,
      arg: issue.url,
      mods: {
          alt: {
              subtitle: issue.assignee ? `Assigned to ${issue.assignee.displayName}` : 'Not Assigned'
          },
          ctrl: {
              subtitle: issue.status.name
          }
      }
  })

;(async () => {
    const service = makeJiraService(...getJiraCredentials())

    const searchById = async (input) => {
        let issue = alfy.cache.get(`search-${input}`)
        if (!issue) {
            issue = [await service.getIssueById(input, ['summary', 'key', 'assignee', 'status'])]

            alfy.cache.set(`search-${input}`, issue, {maxAge: 900000})
        }

        return issue[0] ? issue.map(mapIssueToAlfyOutput) : [{title: `Ticket ${input} does not exist`}]
    }

    const searchByKeyword = async (input) => {
        const additionalCriteria = getEnv('keyword_criteria') || ''
        const criteria = `summary ~ "${input}" ${additionalCriteria}`

        let issues = alfy.cache.get(`search-${input}`)
        if (!issues) {
            issues = await service.getIssues(criteria, ['summary', 'key', 'assignee', 'status'])

            alfy.cache.set(`search-${input}`, issues, {maxAge: 900000})
        }

        return issues.length > 0 ? issues.map(mapIssueToAlfyOutput) : [{title: `No results for ${input}`}]
    }

    const search = isJiraIssueKey(alfy.input) ? searchById : searchByKeyword

    return alfy.output(await search(alfy.input))
})()
