import { MaybeHtmlTranslation } from "./MaybeHtmlTranslation"

export function ConfigDescription({ name }: { name: string }) {
    return (
        <MaybeHtmlTranslation
            name={`config.${name}.description`}
            render={(content, props) => <div {...props}>{content}</div>}
        ></MaybeHtmlTranslation>
    )
}
