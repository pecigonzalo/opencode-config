#!/usr/bin/env nu
# Browse OpenCode store items interactively

def main [] {
    let store_path = (
        [".opencode" "sessions" "store.json"] | path join
    )
    if not ($store_path | path exists) {
        print $"(ansi red)Error:(ansi reset) ($store_path) not found"
        return
    }
    let items = (open $store_path)
    if ($items | is-empty) {
        print "Store is empty."
        return
    }

    # Format each item as a tab-delimited line: id \t status \t [tags] \t summary
    let lines = (
        $items
        | each {|it|
            let status = ($it.status? | default "active")
            let tags = ($it.tags | str join ", ")
            let summary = (
                if ($it.summary | str length) > 80 {
                    ($it.summary | str substring 0..77) + "..."
                } else {
                    $it.summary
                }
            )
            $"($it.id)\t($status)\t($summary)\t[($tags)]"
        }
    )

    # Write store to a temp file so the fzf preview subshell can read it
    let tmp = (mktemp --suffix .json)
    $items | to json | save --force $tmp

    let selected_line = (
        $lines
        | str join "\n"
        | fzf
            --delimiter "\t"
            --with-nth "2,3,4"
            --preview $"nu -c \"open ($tmp) | where id == \(echo {} | cut -f1\) | first | to yaml\""
            --preview-window "right:55%:wrap"
            --height "80%"
            --layout "reverse"
            --prompt "Store > "
            --pointer "▶"
            --header "ENTER to view  ESC to quit"
        | str trim
    )

    rm --force $tmp

    if ($selected_line | is-empty) {
        return
    }

    let id = ($selected_line | split column "\t" | get column0.0)
    let item = ($items | where id == $id | first)

    # --- Metadata section ---
    print $"(ansi green_bold)=== METADATA ===(ansi reset)"
    $item
    | reject -o data
    | to yaml
    | print

    # --- Data section ---
    let data = ($item | get -o data)
    if ($data | is-not-empty) {
        print $"\n(ansi blue_bold)=== DATA ===(ansi reset)"
        let yaml_out = ($data | to yaml)
        let line_count = ($yaml_out | lines | length)

        if $line_count > 30 {
            $yaml_out | less -RF
        } else {
            print $yaml_out
        }
    }
}
