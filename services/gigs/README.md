# Gig archive

Private site at [https://gigs.matthodges.uk](https://gigs.matthodges.uk). It is a separate vhost with its own files and styling. It is not part of the portfolio, and it is not linked from matthodges.uk.

The page deploys to `/var/www/gigs.matthodges.uk/`. The recordings do not. They live on the additional disk, because 300GB of video does not belong in git or on the system disk. Nginx basic auth covers the whole subdomain. Add that auth before copying any videos up.

## Disk

Check what you already have:

```bash
df -h
lsblk
```

300GB of footage needs room to grow, and ext4 keeps a small reserve. Order a **500GB** additional disk (the smallest OVH size that still leaves headroom). It is separate from the VPS system disk and survives a reinstall.

In the OVHcloud panel: **Bare Metal Cloud → Virtual private servers → your VPS → Additional disk → Order an additional disk**.

When the disk shows up, confirm the device name with `lsblk`. The new disk is the one with no mountpoint. The examples below use `/dev/sdb`. If `lsblk` shows a different name, use that. Formatting the wrong disk wipes it.

```bash
sudo fdisk /dev/sdb
```

`n`, accept the defaults, then `w`.

```bash
sudo mkfs.ext4 -m 1 -L gigs /dev/sdb1
sudo mkdir -p /var/media
sudo mount /dev/sdb1 /var/media
sudo blkid /dev/sdb1
```

Add the UUID from `blkid` to `/etc/fstab` (`sudo nano /etc/fstab`):

```
UUID=your-uuid-here /var/media ext4 nofail 0 2
```

`nofail` lets the VPS boot if the disk is ever detached.

```bash
sudo mount -a
df -h /var/media
sudo mkdir -p /var/media/gigs/videos
sudo chown -R rocky:rocky /var/media/gigs
sudo chmod 755 /var/media /var/media/gigs /var/media/gigs/videos
```

To grow it later: OVH panel → **Increase the disk size**, then follow [OVH's resize guide](https://docs.ovhcloud.com/en/guides/bare-metal-cloud/virtual-private-servers/increase-additional-disk.md) and extend the ext4 filesystem. Do that before the archive is full. The page shows free space once the catalog exists.

## Site

Add a DNS A record for `gigs.matthodges.uk` to the same address as the VPS. Then, on the server:

```bash
sudo mkdir -p /var/www/gigs.matthodges.uk
sudo chown rocky:rocky /var/www/gigs.matthodges.uk
sudo cp /home/rocky/gigs/gigs.matthodges.uk.conf /etc/nginx/conf.d/gigs.matthodges.uk.conf
sudo dnf install -y httpd-tools
sudo htpasswd -c /etc/nginx/gigs.htpasswd matt
sudo chown root:nginx /etc/nginx/gigs.htpasswd
sudo chmod 640 /etc/nginx/gigs.htpasswd
```

If `nginx -t` complains that the certificate files are missing, comment out the `listen 443` server, reload, issue the cert, then put that server back:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/gigs.matthodges.uk -d gigs.matthodges.uk
sudo nginx -t && sudo systemctl reload nginx
```

The conf file is in this repo at `services/gigs/gigs.matthodges.uk.conf`. After a push to `main` it is also at `/home/rocky/gigs/gigs.matthodges.uk.conf`.

The page files arrive on the next push to `main`, into `/var/www/gigs.matthodges.uk/`. That copy is separate from the portfolio rsync. Open `https://gigs.matthodges.uk` in a private window. It should ask for the password before the page loads. If it does not, the files are not protected and should not be uploaded yet.

## Copy recordings up

From this repo, on your machine (SSH port 2233, same as the site deploy):

```bash
GIGS_HOST=your.vps.example ./services/gigs/sync-gigs.sh /path/to/local/videos
```

That uploads video files and optional sidecar JSON, then rebuilds `/var/media/gigs/catalog.json`. It does not delete server files that are missing from the local folder.

Filenames can be anything safe. A leading date is picked up automatically:

```
2024-06-12_the-venue_full-set.mp4
```

That becomes date `2024-06-12`, venue `the venue`, title `full set`. To override, put a sidecar next to the file named `2024-06-12_the-venue_full-set.mp4.json`:

```json
{
  "title": "Full set",
  "venue": "The Venue",
  "date": "2024-06-12",
  "notes": "Desk recording, second half is clipped."
}
```

Notes you edit in `catalog.json` are kept on the next rebuild unless a sidecar sets the same field. Browser playback works for MP4, WebM, and Ogg. MOV is hit and miss. MKV is offered as a download. Install `ffmpeg` on the VPS if you want durations filled in (`ffprobe`).

The catalog rebuild also lands on the server at `/home/rocky/gigs/rebuild-catalog.py` on the next deploy, or immediately via the sync script.

## Edit from the site

The player has an Edit button for the title, date, venue, notes, and file name. A save writes a sidecar next to the video, renames the file when the file name changed, and rebuilds the catalog. The date on the site is the date you save, including when the file name still starts with an older one.

The editor is a small service on the VPS, behind the same password as the site. Once, as root, after the files are in `/home/rocky/gigs`:

```bash
chown -R rocky:rocky /var/media/gigs
cp /home/rocky/gigs/gigs.matthodges.uk.conf /etc/nginx/conf.d/gigs.matthodges.uk.conf
cp /home/rocky/gigs/gigs-edit.service /etc/systemd/system/gigs-edit.service
nginx -t && systemctl reload nginx
systemctl enable --now gigs-edit
```
