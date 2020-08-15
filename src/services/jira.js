import JiraApi from 'jira-client'
import { getEnv, replaceAlfredVars } from '../helpers'

export default ((host, username, password) => {
    /**
     * @property api.findIssue
     * @property api.searchJira
     */
    const api = new JiraApi({
        protocol: 'https',
        host,
        username,
        password,
        apiVersion: '2',
        strictSSL: true
    })

    const getIssueById = async (id) => {
        try {
            const {fields: {summary}} = await api.findIssue(id, '', 'summary')

            const title = summary.replace(/"/g, '')
            const url = `https://${host}/browse/${id}`

            return {title, url}
        } catch (e) {
            console.error(e.message)

            return false
        }
    }

    const getIssuesByKeyword = async (keyword) => {
        try {
            const additionalCriteria = getEnv('keyword_criteria') || ''
            const criteria = replaceAlfredVars(`summary ~ "${keyword}" ${additionalCriteria}`)

            const results = await api.searchJira(criteria, {fields: ['summary', 'key']})

            const issues = results.issues.map((issue) => {
                const title = issue.fields.summary.replace(/"/g, '')
                const url = `https://${host}/browse/${issue.key}`

                return {title, url}
            })

            return issues
        } catch (e) {
            console.error(e.message)

            return false
        }
    }

    return {
        getIssueById,
        getIssuesByKeyword,
    }
})
