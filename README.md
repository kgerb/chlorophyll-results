# LeafH2O · Chlorophyll results

A public visual story about LeafH2O's current chlorophyll research, with real
canopy LiDAR and interactive comparisons of Beech, Douglas and Mixed towers.

Website: https://kgerb.github.io/chlorophyll-results/

**Research snapshot: 13 October 2026. Preliminary diagnostic results.**
Full-site alignment and independent material validation remain open. These
correlations are not validated chlorophyll predictions or water-content estimates.

## Explore locally

```bash
python -m http.server 8080
```

Open http://localhost:8080. This is a static site with no package installation,
build step, external scripts, remote fonts or tracking. All paths for local
assets are relative, including deployment under a GitHub project path.

## The 3D walkthrough

Scroll through the shared workflow and then Beech → Douglas → Mixed. Drag to
rotate, right-drag or use two fingers to pan, and wheel/pinch to zoom directly
in the story. Scroll outside the cloud to continue reading. Your chosen view
stays in place across chapters and towers until **Reset view** (or Home).
**Explore this scene** keeps the expanded dates, channels, cleaning choices
and sample controls; **Return to story** (or Escape) restores the chapter's
evidence settings while preserving your camera. Arrow keys rotate and +/− zoom.
A sample selector provides a keyboard alternative to picking 3D markers.

The visible timeline plays actual available flights: five for Beech and six
each for Douglas and Mixed. Play/Pause keeps the camera fixed and holds each
loaded snapshot for two seconds. Playback pauses on chapter/tower changes,
leaving the walkthrough, hidden pages or a load failure. Dates are separate
observations: no synthetic intermediate clouds or time interpolation. The last
complete snapshot stays visible while the next loads, with its original label.
Rounded controls, damped gestures and time-based camera/fade easing make scene
changes smoother. Reset returns to the current chapter's composed camera.

The viewer uses locally bundled [Three.js](https://threejs.org/) 0.170.0 and
OrbitControls under the MIT license (`vendor/THREE-LICENSE.txt`); the package
source and archive hash are recorded in `vendor/source.json`. No API key or
external tile service is required. Reduced-motion preferences disable camera
animation, gesture inertia, fades and scroll drift. The written story and result tables remain available
when WebGL or point data cannot load. The homepage preview is a capture of the
actual rendered Beech scene.

Material colours preserve out-of-range reflectance returns. Single-channel
reflectance colours use a fixed 0–100 scale and require distance 15–50 m.
Neither this display filter nor the wood prediction changes geometry membership.
The 3D date/channel controls do not recompute the across-date statistical results.

## Data and methods

- `data/observations.csv`: 109 exact-date pairs repeated across four cleaning
  states, giving 436 rows. A row represents one location/date/cleaning state.
- `data/correlations.csv`: pooled and date-adjusted coefficients and conditional
  resampling bounds for every tower/cleaning selection.
- `data/results.json`: the same reviewed observations and summaries for the UI.
- `data/scene.json`: 17 real tower/date display scenes (120,000 returns each),
  sample positions in tower-local metres, survey provenance and mask/channel
  counts. The March12 display exists for Douglas and Mixed; Beech starts April7.
- `data/clouds/`: lazy-loaded point buffers (24 bytes per point), preserving
  calibrated Reflectance, independent geometry and wood flags, quality flags,
  channel and source-row identity. These display samples never produce statistics.
  The separate 40,000-point alignment buffer retains actual before/after positions
  of the same Beech returns across five dates, not synthetic intermediate scans.
- `data/provenance.json`: source paths within the private research repository,
  SHA256 hashes, cohort definition, display-sampling seed and limitations.

The exact-date cohort uses supported 65 cm cubes at 23 locations. March20
flight and May26 field data are excluded. All four cleaning choices use the
same observation membership. Field CFR is F735/F700; the LiDAR ratio is mean
calibrated Reflectance at 1064 nm divided by mean Reflectance at 532 nm.
Channel support requires at least five valid returns per channel, finite
Reflectance in [0,100], finite scanner distance in [15,50] m and a positive
532 nm denominator.

Within-date correlations remove each date's means from both variables.
Resampling ranges are the 2.5th–97.5th percentiles of 2,000 resamples of whole
location histories, not independent-tree confidence intervals. They do not
include alignment, field-selection or model uncertainty. Do not treat small
changes in correlation as an established improvement in prediction.

Source evidence and the export script are maintained in the private
`kgerb/LeafH2O` research repository under
`chlorophyll/04_analysis/showcase/`. This public repository is a curated
snapshot, not a mirror of the research history. Update its data through the
reviewed export workflow, preserving provenance and limitations.

## Researchers

- [Kilian Gerberding](https://orcid.org/0009-0002-5001-2571) · University of Freiburg, Geosense
- [Jana Seiler](https://orcid.org/0009-0001-9943-2350) · University of Freiburg, INATECH

[Institutional project page](https://uni-freiburg.de/enr-geosense/research/leafh2o-a-uav-mounted-dual-wavelength-lidar-for-leaf-water-content-retrieval/)

## Renaming

The repository may be renamed later. Relative assets continue to work, but
update the GitHub links and advertised site address. GitHub redirects repository
links, but does not automatically redirect the old Pages website address.
