import { MoveNag } from "./nag"

type AnnotationTextPart = {
    /** Printable text part. */
    text: string
    /** Possible command. */
    command: string | null
    /** Command parameters are only present if command is not null. */
    params?: string[]
    /** Starting position in the raw annotation text. */
    start: number
    /** Length of this raw text part (sum of all text part lengths = annotation raw text length). */
    length: number
}

/**
 * Chess move annotation, usually parsed from a PGN file.
 */
interface MoveAnnotation {
    /** Contains the raw text content of the annotation. */
    fullText: string
    /** Commands within annotation will be stripped from cleanText. */
    cleanText: string
    /** Contains the clean text parts and possible commands parsed into objects. */
    textParts: AnnotationTextPart[]
    /** Numeric Annotation Glyph assigned to this annotation. */
    nag: MoveNag | null
    /** Possible text symbol for the numeric annotation glyph. */
    symbol: string | null
    /**
     * Get a string representation of this annotation object.
     * @returns
     */
    toString: () => string
}

export { MoveAnnotation, AnnotationTextPart }
