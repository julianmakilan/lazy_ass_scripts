# Content source and validation record

Checked on 2026-10-17. This is a human-curated, original teaching deck. URLs are references for optional reading; the app never fetches them to build or refresh cards.

## Source method

Debian’s official Bookworm manual archive supplies upstream-authored manuals at a fixed target baseline: GNU Bash 5.2, Coreutils 9.1, Findutils 4.9, Grep 3.8, systemd 252, iproute2 6.1, and the packaged tools listed below. These commands use options available at that baseline. Ubuntu installations can differ in configuration, package presence, journal access and service activation.

Each card’s primary source documents the main command. `sourceUrls` adds manuals for other pipeline stages, shell grammar, and output formats where needed. The deck explains shell quoting, option terminators, filters, format arguments, pipes and redirections rather than executing examples. Distribution-specific paths and package/service assumptions are included in requirements.

Upstream GNU documentation was additionally consulted for [Bash pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines), [Coreutils sorting](https://www.gnu.org/software/coreutils/manual/coreutils.html#sort-invocation), [Findutils size rounding](https://www.gnu.org/software/findutils/manual/html_node/find_html/Size.html), and [Grep matching](https://www.gnu.org/software/grep/manual/html_node/Matching-Control.html). Where upstream overview fetches failed, Debian’s packaged copies were used for complete option references.

## Verification scope

- 100 unique stable IDs, ten groups of ten, required fields and source URL structures validated locally.
- Every command passed `bash -n` grammar parsing. This check does not execute commands or prove their runtime output.
- Flag meanings, syntax and stated output interpretations were reviewed against the linked manuals. Online checks reached all 55 Debian URLs successfully: 54 fetched as HTTP 200; the initially incorrect util-linux/swapon URL was corrected to mount/swapon and verified through the web reader.
- Review corrections included using journalctl `--case-sensitive=no`, documenting reverse ordering for journal grep plus line limit, systemctl `--legend=no`, swap’s Debian package path, vmstat’s instantaneous process/memory fields, rolling find timestamps, and NUL-delimited xargs batching.
- Eleven automated tests cover the deck, calendar cycle, hourly selection, DST, notification plans and Scriptable API adapters. Native iOS behavior still requires a device; see the installation guide.

## Supporting manual index

Each link appears on the corresponding card(s) in the JSON. Card IDs below make the source-to-content mapping reviewable.

| Official manual | Cards |
| --- | --- |
| [getfacl.1](https://manpages.debian.org/bookworm/acl/getfacl.1.en.html) | linux-03-10 |
| [apt-cache.8](https://manpages.debian.org/bookworm/apt/apt-cache.8.en.html) | linux-09-08, linux-09-09 |
| [bash.1](https://manpages.debian.org/bookworm/bash/bash.1.en.html) | linux-02-09, linux-02-10, linux-03-08, linux-03-09, linux-04-04, linux-05-02, linux-10-01, linux-10-02, linux-10-04, linux-10-05, linux-10-06, linux-10-08 |
| [cat.1](https://manpages.debian.org/bookworm/coreutils/cat.1.en.html) | linux-09-01 |
| [chmod.1](https://manpages.debian.org/bookworm/coreutils/chmod.1.en.html) | linux-03-09 |
| [cut.1](https://manpages.debian.org/bookworm/coreutils/cut.1.en.html) | linux-02-09, linux-10-02 |
| [date.1](https://manpages.debian.org/bookworm/coreutils/date.1.en.html) | linux-10-06 |
| [df.1](https://manpages.debian.org/bookworm/coreutils/df.1.en.html) | linux-04-01, linux-04-02 |
| [du.1](https://manpages.debian.org/bookworm/coreutils/du.1.en.html) | linux-04-03, linux-04-04, linux-04-05 |
| [groups.1](https://manpages.debian.org/bookworm/coreutils/groups.1.en.html) | linux-03-03 |
| [head.1](https://manpages.debian.org/bookworm/coreutils/head.1.en.html) | linux-01-06, linux-05-02 |
| [id.1](https://manpages.debian.org/bookworm/coreutils/id.1.en.html) | linux-03-01, linux-03-02 |
| [ls.1](https://manpages.debian.org/bookworm/coreutils/ls.1.en.html) | linux-01-02, linux-01-03 |
| [nproc.1](https://manpages.debian.org/bookworm/coreutils/nproc.1.en.html) | linux-05-09 |
| [pwd.1](https://manpages.debian.org/bookworm/coreutils/pwd.1.en.html) | linux-01-01 |
| [readlink.1](https://manpages.debian.org/bookworm/coreutils/readlink.1.en.html) | linux-01-05 |
| [sort.1](https://manpages.debian.org/bookworm/coreutils/sort.1.en.html) | linux-02-09, linux-04-04, linux-10-02 |
| [stat.1](https://manpages.debian.org/bookworm/coreutils/stat.1.en.html) | linux-01-04, linux-03-05 |
| [tail.1](https://manpages.debian.org/bookworm/coreutils/tail.1.en.html) | linux-01-07, linux-07-09 |
| [uname.1](https://manpages.debian.org/bookworm/coreutils/uname.1.en.html) | linux-09-02 |
| [uniq.1](https://manpages.debian.org/bookworm/coreutils/uniq.1.en.html) | linux-10-02 |
| [wc.1](https://manpages.debian.org/bookworm/coreutils/wc.1.en.html) | linux-01-08, linux-02-10, linux-10-01 |
| [diff.1](https://manpages.debian.org/bookworm/diffutils/diff.1.en.html) | linux-01-09 |
| [dpkg-query.1](https://manpages.debian.org/bookworm/dpkg/dpkg-query.1.en.html) | linux-09-05, linux-09-06, linux-09-07 |
| [dpkg.1](https://manpages.debian.org/bookworm/dpkg/dpkg.1.en.html) | linux-09-10 |
| [file.1](https://manpages.debian.org/bookworm/file/file.1.en.html) | linux-01-10 |
| [find.1](https://manpages.debian.org/bookworm/findutils/find.1.en.html) | linux-02-01, linux-02-02, linux-02-03, linux-02-04, linux-02-05, linux-02-10, linux-03-06, linux-03-07 |
| [xargs.1](https://manpages.debian.org/bookworm/findutils/xargs.1.en.html) | linux-02-10 |
| [grep.1](https://manpages.debian.org/bookworm/grep/grep.1.en.html) | linux-02-06, linux-02-07, linux-02-08, linux-05-10, linux-10-03 |
| [ip-address.8](https://manpages.debian.org/bookworm/iproute2/ip-address.8.en.html) | linux-08-01, linux-10-05 |
| [ip-link.8](https://manpages.debian.org/bookworm/iproute2/ip-link.8.en.html) | linux-08-02 |
| [ip-neighbour.8](https://manpages.debian.org/bookworm/iproute2/ip-neighbour.8.en.html) | linux-08-06 |
| [ip-route.8](https://manpages.debian.org/bookworm/iproute2/ip-route.8.en.html) | linux-08-03, linux-08-04, linux-08-05 |
| [ip-rule.8](https://manpages.debian.org/bookworm/iproute2/ip-rule.8.en.html) | linux-08-10 |
| [ip.8](https://manpages.debian.org/bookworm/iproute2/ip.8.en.html) | linux-08-01, linux-08-02, linux-08-03, linux-08-04, linux-10-05 |
| [ss.8](https://manpages.debian.org/bookworm/iproute2/ss.8.en.html) | linux-08-07, linux-08-08, linux-08-09, linux-10-09 |
| [lsof.8](https://manpages.debian.org/bookworm/lsof/lsof.8.en.html) | linux-04-10 |
| [proc_meminfo.5](https://manpages.debian.org/bookworm/manpages/proc_meminfo.5.en.html) | linux-05-10 |
| [swapon.8](https://manpages.debian.org/bookworm/mount/swapon.8.en.html) | linux-04-09 |
| [sshd.8](https://manpages.debian.org/bookworm/openssh-server/sshd.8.en.html) | linux-10-07 |
| [free.1](https://manpages.debian.org/bookworm/procps/free.1.en.html) | linux-05-06 |
| [pgrep.1](https://manpages.debian.org/bookworm/procps/pgrep.1.en.html) | linux-05-04 |
| [ps.1](https://manpages.debian.org/bookworm/procps/ps.1.en.html) | linux-05-01, linux-05-02, linux-05-03, linux-05-05 |
| [uptime.1](https://manpages.debian.org/bookworm/procps/uptime.1.en.html) | linux-05-08 |
| [vmstat.8](https://manpages.debian.org/bookworm/procps/vmstat.8.en.html) | linux-05-07 |
| [sudo.8](https://manpages.debian.org/bookworm/sudo/sudo.8.en.html) | linux-04-10, linux-08-08, linux-10-07 |
| [hostnamectl.1](https://manpages.debian.org/bookworm/systemd/hostnamectl.1.en.html) | linux-09-03 |
| [journalctl.1](https://manpages.debian.org/bookworm/systemd/journalctl.1.en.html) | linux-07-01, linux-07-02, linux-07-03, linux-07-04, linux-07-05, linux-07-06, linux-07-07, linux-07-08, linux-07-10 |
| [os-release.5](https://manpages.debian.org/bookworm/systemd/os-release.5.en.html) | linux-09-01 |
| [systemctl.1](https://manpages.debian.org/bookworm/systemd/systemctl.1.en.html) | linux-06-01, linux-06-02, linux-06-03, linux-06-04, linux-06-05, linux-06-06, linux-06-07, linux-06-08, linux-06-09, linux-10-01 |
| [systemd-analyze.1](https://manpages.debian.org/bookworm/systemd/systemd-analyze.1.en.html) | linux-06-10, linux-10-10 |
| [timedatectl.1](https://manpages.debian.org/bookworm/systemd/timedatectl.1.en.html) | linux-09-04 |
| [findmnt.8](https://manpages.debian.org/bookworm/util-linux/findmnt.8.en.html) | linux-04-07, linux-04-08 |
| [lsblk.8](https://manpages.debian.org/bookworm/util-linux/lsblk.8.en.html) | linux-04-06 |
| [namei.1](https://manpages.debian.org/bookworm/util-linux/namei.1.en.html) | linux-03-04 |
| [GNU Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines) | linux-02-09, linux-02-10, linux-04-04, linux-05-02, linux-10-01, linux-10-02 |
| [GNU coreutils#sort-invocation](https://www.gnu.org/software/coreutils/manual/coreutils.html#sort-invocation) | linux-04-04 |
| [GNU Size](https://www.gnu.org/software/findutils/manual/html_node/find_html/Size.html) | linux-02-04 |
| [GNU Matching-Control](https://www.gnu.org/software/grep/manual/html_node/Matching-Control.html) | linux-02-08 |
