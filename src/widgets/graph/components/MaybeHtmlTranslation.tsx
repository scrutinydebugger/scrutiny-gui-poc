import { useTranslation } from "react-i18next"

export function MaybeHtmlTranslation({
    name,
    render,
}: {
    name: string
    render: {
        (content: JSX.Element | null, props: { dangerouslySetInnerHTML?: { __html: string } }): JSX.Element
    }
}) {
    const { t } = useTranslation("widget:graph")
    const value = t(name, { returnObjects: true }) as string | { html?: string }
    if (typeof value === "object" && typeof value?.html === "string")
        return render(null, {
            dangerouslySetInnerHTML: { __html: value.html as string },
        })

    return render(<>{value}</>, {})
}
