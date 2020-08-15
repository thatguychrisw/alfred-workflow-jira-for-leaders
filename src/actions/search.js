import alfy from 'alfy'
import jiraServiceFactory from '../services/jira'
import { getJiraCredentials, isJiraIssueKey } from '../helpers'

const mapIssueToAlfyOutput = (issue) => ({
    title: issue.title,
    subtitle: issue.url,
    arg: issue.url,
})

;(async () => {
    const service = jiraServiceFactory(...getJiraCredentials())

    const searchById = async (input) => {
        const issue = [await service.getIssueById(input)]

        return issue.map(mapIssueToAlfyOutput)
    }

    const searchByKeyword = async (input) => {
        const issues = await service.getIssuesByKeyword(input)

        return issues.map(mapIssueToAlfyOutput)
    }

    const search = isJiraIssueKey(alfy.input) ? searchById : searchByKeyword

    return alfy.output(await search(alfy.input))
})()
