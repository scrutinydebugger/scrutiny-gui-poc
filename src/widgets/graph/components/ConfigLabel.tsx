import { MaybeHtmlTranslation } from "./MaybeHtmlTranslation"

export function ConfigLabel({ name }: { name: string }) {
    return (
        <MaybeHtmlTranslation
            name={`config.${name}.label`}
            render={(content, props) => <span {...props}>{content}</span>}
        ></MaybeHtmlTranslation>
    )
}
