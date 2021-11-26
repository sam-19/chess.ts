/**
 * A single move annotation.
 */

import { MoveAnnotation, AnnotationTextPart } from '../types/annotation'

class Annotation implements MoveAnnotation {
    fullText: string
    cleanText: string = ''
    textParts: AnnotationTextPart[] = []
    nag: number | null = null
    symbol: string | null = null

    constructor (text: string, nag?: number) {
        if (nag) {
            this.nag = nag
            this.fullText = ''
            return
        }
        this.fullText = text
        // Search the text for possible command tags
        if (text.indexOf('[%') === -1) {
            // No command tags
            this.cleanText = text.trim()
            this.textParts = [{
                text: text.trim(),
                command: null,
                start: 0,
                length: text.trim().length
            }]
        } else {
            const tags = text.match(/\[%.+?\]/g) || []
            if (!tags.length) {
                console.error(`The annotation "${text}" contained an opening command tag but not a valid closing tag!`)
                return
            }
            // We need to trim the commands from the annotation while we go through them. Otherwise the
            // same command twice or more times in the same annotation would lead to errors.
            // Add the first text part.
            this.textParts.push({
                text: text.substring(0, text.indexOf(tags[0])),
                command: null,
                start: 0,
                length: text.indexOf(tags[0])
            })
            let cleanAnn = text
            let curPos = 0
            for (let i=0; i<tags.length; i++) {
                let cmd = tags[i].substring(2, tags[i].length - 1).trim().split(/\s+/)
                let label = ''
                if (cmd.length < 2) {
                    console.error(`Annotation command ${tags[i]} is malformed!`)
                    continue
                } else if (cmd.length > 2) {
                    // Combine all items from the third one onward into one label
                    label = cmd.slice(2, cmd.length).join(' ')
                    cmd.pop()
                    // Remove possible double quotes from start and end
                    if (label.startsWith('"') && label.endsWith('"')) {
                        label = label.substring(1, label.length - 1)
                    }
                }
                const params = cmd[1].split(',')
                // Remove the command from cleaned annotation
                cleanAnn = cleanAnn.replace(tags[i], label)
                const start = text.indexOf(tags[i], curPos)
                this.textParts.push({
                    text: label,
                    command: cmd[0],
                    params: params,
                    start: start,
                    length: tags[i].length
                })
                curPos = start + tags[i].length
                // Add the part following this command tag
                if (tags.length > i + 1) {
                    const nextIdx = text.indexOf(tags[i+1], curPos)
                    this.textParts.push({
                        text: text.substring(curPos, nextIdx),
                        command: null,
                        start: curPos,
                        length: nextIdx - curPos
                    })
                    curPos = nextIdx
                }
            }
            // Add possible remaining text part
            if (text.length > curPos) {
                this.textParts.push({
                    text: text.substring(curPos),
                    command: null,
                    start: curPos,
                    length: text.length - curPos
                })
            }
            this.cleanText = cleanAnn
        }
    }
    toString () {
        if (this.nag) {
            return `$${this.nag}`
        } else {
            return this.fullText
        }
    }
}

export default Annotation
