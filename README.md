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

## Data and methods

- `data/observations.csv`: 109 exact-date pairs repeated across four cleaning
  states, giving 436 rows. A row represents one location/date/cleaning state.
- `data/correlations.csv`: pooled and date-adjusted coefficients and conditional
  resampling bounds for every tower/cleaning selection.
- `data/results.json`: the same reviewed observations and summaries for the UI.
- `data/canopy.json`: 14,000 uniformly sampled actual June18 Beech display
  returns in a local metric frame, rounded to 1 mm. Labels encode remaining
  returns (0), geometry-selected structures (1), or predicted wood outside
  structures (2). This is not the statistical sample or verified leaf truth.
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
