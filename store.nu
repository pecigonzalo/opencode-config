#!/usr/bin/env nu
# Browse OpenCode store items interactively

def main [] {
    let legacy_store_path = (
        [".opencode" "sessions" "store.json"] | path join
    )
    let yaml_store_dir = (
        [".opencode" "sessions" "store"] | path join
    )

    let has_legacy_store = ($legacy_store_path | path exists)
    let has_yaml_store = ($yaml_store_dir | path exists)

    if (not $has_legacy_store) and (not $has_yaml_store) {
        print $"(ansi red)Error:(ansi reset) No store backend found at ($legacy_store_path) or ($yaml_store_dir)"
        return
    }

    let legacy_items = if $has_legacy_store {
        open $legacy_store_path
    } else {
        []
    }

    let yaml_items = if $has_yaml_store {
        let yaml_paths = (
            (glob ([$yaml_store_dir "*.yaml"] | path join))
            | append (glob ([$yaml_store_dir "*.yml"] | path join))
            | uniq
        )

        if ($yaml_paths | is-empty) {
            []
        } else {
            $yaml_paths
            | each {|yaml_path|
                try {
                    open $yaml_path
                } catch {
                    print $"(ansi yellow)Warning:(ansi reset) Failed to read ($yaml_path) — skipping"
                    null
                }
            }
            | compact
            | each {|item|
                if (($item | describe) | str starts-with "record") {
                    [$item]
                } else {
                    $item
                }
            }
            | flatten
        }
    } else {
        []
    }

    let combined_items = (
        $yaml_items
        | append $legacy_items
    )

    let all_items = if ($combined_items | is-empty) {
        []
    } else {
        $combined_items
        | group-by id
        | transpose _group_key group_items
        | each {|group| $group.group_items | first}
    }

    let items = ($all_items | where {|it| ($it.status? | default "active") != "archived"})
    if ($items | is-empty) {
        print "Store is empty (or all items are archived)."
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
