import { useTranslation } from "react-i18next"

export function ConfigOptions({ name }: { name: string }) {
    const { t } = useTranslation("widget:graph")

    const options = t(`config.${name}.options`, { returnObjects: true })
    if (typeof options === "string") return <></>
    const keys = Object.keys(options)
    return (
        <ul>
            {Object.values(options).map(({ label, description }, idx) => (
                <li key={keys[idx]}>
                    <b>{label}:</b>{" "}
                    {typeof description === "object" && typeof description?.html === "string" ? (
                        <span dangerouslySetInnerHTML={{ __html: description.html }}></span>
                    ) : (
                        description
                    )}
                </li>
            ))}
        </ul>
    )
}
