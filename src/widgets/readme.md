# Adding a new Widget

To add a new widget, Copy the "sampleWidget" folder, rename it to your desired widget name, and update the folowing files from within it (path relative to widget folder):

-   translations/en.json
    Only required entry is the `display_name`
-   index.tsx
    update the `meta.name` and `meta.icon` information
    update the Widget's return value, mainly the SampleComponent part.

Then, add the export to the ./index.tsx (relative to this file). The order in which the widgets are in the exported array will dictate the order in which they are in the side menu
