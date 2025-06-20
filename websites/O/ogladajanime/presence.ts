import { ActivityType, getTimestamps } from 'premid'

const presence = new Presence({ clientId: '1137362720254074972' })

const browsingTimestamp = Math.floor(Date.now() / 1000)

let userID = 0

let player: HTMLMediaElement
let isPlaying = false

// TODO: add support for https://ogladajanime.pl/anime_seasons. Would have done that if I only knew what it was about
const staticBrowsing = {
  '/watch2gether': 'Przegląda pokoje do oglądania z innymi',
  '/main2': 'Przegląda stronę główną',
  '/search/name/': 'Szuka Anime',
  '/search/custom': 'Szuka Anime',
  '/search/rand': 'Przegląda losowe anime',
  '/search/new': 'Przegląda najnowsze anime',
  '/search/main': 'Przegląda najlepiej oceniane anime',
  '/chat': 'Rozmawia na chacie',
  '/user_activity': 'Przegląda swoją ostatnią aktywność',
  '/last_comments': 'Przegląda ostatnie komentarze',
  '/active_sessions': 'Przegląda aktywne sesje logowania',
  '/manage_edits': 'Przegląda ostatnie edycje',
  '/anime_list_to_load': 'Ładuję listę anime z innej strony',
  '/discord': 'Sprawdza jak można się skontaktować',
  '/support': 'Sprawdza jak można wspierać OA',
  '/radio': 'Słucha Radio Anime',
  '/rules': 'Czyta regulamin',
  '/harmonogram': 'Przegląda harmonogram emisji odcinków Anime',
  '/': 'Przegląda stronę główną', // This MUST stay at the end, otherwise this will always display no matter the page
}

enum ListItemStatus {
  Oglądam = 1,
  Obejrzane = 2,
  Planuje = 3,
  Wstrzymane = 4,
  Porzucone = 5
}

function updatePresence() {
  presence.on('UpdateData', async () => {
    getUserID()
    const { pathname } = document.location
    const browsingStatusEnabled = await presence.getSetting<boolean>('browsingStatus')
    const useAltName = await presence.getSetting<boolean>('useAltName')
    const hideWhenPaused = await presence.getSetting<boolean>('hideWhenPaused')
    const presenceData: PresenceData = {
      type: ActivityType.Watching,
      startTimestamp: browsingTimestamp,
      largeImageKey: 'https://cdn.rcd.gg/PreMiD/websites/O/ogladajanime/assets/0.png',
    }

    if (pathname.includes('/user_comments/') && browsingStatusEnabled) {
      const id = pathname.replace('/user_comments/', '')
      presenceData.buttons = await setButton('Zobacz listę komentarzy', document.location.href)
      presenceData.details = 'Przegląda komentarze wysłane przez użytkownika'
      if (id != null) {
        const name = document.querySelector('h4[class="card-title col-12 text-center mb-1"]')?.textContent?.replace('Komentarze użytkownika: ', '')?.replace(/\s/g, '')
        const comments = (document.querySelector('#site-content section .row')?.querySelectorAll('div[class="col-12 mb-3"]').length ?? 1) - 1

        if (name) {
          presenceData.details = `Przegląda komentarze wysłane przez '${name}'`
        }

        presenceData.state = `${commentsString(comments)} przez użytkownika`

        presenceData.largeImageKey = `https://cdn.ogladajanime.pl/images/user/${id}.webp`
        presenceData.smallImageKey = 'https://cdn.rcd.gg/PreMiD/websites/O/ogladajanime/assets/0.png'
      }
    }
    else if (pathname.includes('/anime_list/') && browsingStatusEnabled) {
      let id = pathname.replace('/anime_list/', '')
      const match = id.match(/\/\d/)
      let category = 0
      if (match != null) {
        const split = id.split('/')
        category = Number.parseInt(split.at(1) as string)
      }
      id = id.replace(/\/\d/, '')

      presenceData.details = 'Przegląda listę Anime'
      presenceData.buttons = await setButton('Zobacz listę Anime', document.location.href)
      if (id != null) {
        if (category === 0) {
          const statuses = document.querySelectorAll('td[class="px-1 px-sm-2"]')
          let watched = 0
          let watching = 0
          statuses.forEach((elem, _, __) => {
            const select = elem.querySelector('select')
            if (select != null) {
              const value = Number.parseInt(select.value)
              if (value === ListItemStatus.Obejrzane)
                watched++
              else if (value === ListItemStatus.Oglądam)
                watching++
            }
            else if (elem.innerHTML != null) {
              if (elem.innerHTML?.trim()?.replace(' ', '') === ListItemStatus[ListItemStatus.Obejrzane])
                watched++
              else if (elem.textContent?.trim()?.replace(' ', '') === ListItemStatus[ListItemStatus.Oglądam])
                watching++
            }
          })

          if (watching === 0)
            presenceData.state = `${watchedString(watched)}`
          else
            presenceData.state = `Ogląda ${watching} • ${watchedString(watched)}`
        }
        else {
          let categoryName: string = ListItemStatus[category as ListItemStatus]

          const count = document.querySelectorAll('td[class="px-0 px-sm-2"]').length / 2
          presenceData.state = `Kategoria '${categoryName}' • ${count} anime`
        }

        const name = document.querySelector('h4[class="card-title col-12 text-center mb-1"]')?.textContent?.replace('- Lista anime', '')?.replace(/\s/g, '')

        if (name) {
          presenceData.details = `Przegląda listę '${name}'`
        }

        presenceData.largeImageKey = `https://cdn.ogladajanime.pl/images/user/${id}.webp`
        presenceData.smallImageKey = 'https://cdn.rcd.gg/PreMiD/websites/O/ogladajanime/assets/0.png'
      }
    }
    else if (pathname.includes('/profile') && browsingStatusEnabled) {
      const pfp = document.querySelector('img[alt="Profile Avatar"]')
      const name = document.querySelector('h4[class="card-title col-12 text-center m-0 text-dark"]')?.textContent?.replace(/\s/g, '')?.replace('-Profil', '')
      // TODO: add a state for presence
      if (name) {
        presenceData.details = `Przegląda profil '${name}'`
      }
      else {
        presenceData.details = 'Przegląda profil'
      }
      if (pfp) {
        presenceData.largeImageKey = pfp.getAttribute('src')
        presenceData.smallImageKey = 'https://cdn.rcd.gg/PreMiD/websites/O/ogladajanime/assets/0.png'
      }
      if(pathname.replace('/profile/', '') == userID.toString())
        presenceData.buttons = await profileButton()
      else
        presenceData.buttons = await setButton('Zobacz Profil', document.location.href)
    }
    else if (pathname.includes('/anime')) {
      checkForPlayer()
      const anime = document.querySelector('#anime_name_id')
      let name = anime?.textContent
      const alternativeName = anime?.parentElement?.querySelector(
        'i[class="text-muted text-trim"]',
      )
      if (alternativeName != null) {
        const altName = alternativeName?.getAttribute('title')
        if (altName != null && altName.length !== 0 && useAltName)
          name = altName
      }
      const animeicon = document.querySelector('.img-fluid.lozad')
      const episodeList = document.querySelector('#ep_list')
      const activeEpisode = episodeList?.querySelector('.active')

      const ratingElement = document.getElementById('my_anime_rate')
      const rating = ratingElement?.parentElement?.querySelector('h4')
      const voteCount = ratingElement?.parentElement?.querySelector('.text-left')

      if (name) {
        presenceData.details = name
        presenceData.state = `Odcinek ${activeEpisode?.getAttribute('value') ?? 0
        } • ${activeEpisode?.querySelector('p')?.innerHTML ?? 'N/A'}`
      }
      else {
        return presence.clearActivity()
      }

      if (player != null && isPlaying) {
        const timestamps = getTimestamps(player.currentTime, player.duration)
        presenceData.startTimestamp = timestamps[0]
        presenceData.endTimestamp = timestamps[1]
      }
      else if (!isPlaying && !browsingStatusEnabled && hideWhenPaused) {
        return presence.clearActivity()
      }

      if (rating && voteCount) {
        presenceData.largeImageText = `${rating.textContent} • ${voteCount.textContent}`
      }

      if (animeicon) {
        presenceData.smallImageKey = 'https://cdn.rcd.gg/PreMiD/websites/O/ogladajanime/assets/0.png'
        presenceData.largeImageKey = animeicon.getAttribute('data-srcset')?.split(' ')[0]
      }

      presenceData.buttons = await setButton('Obejrzyj Teraz', document.location.href)
    }
    else if (pathname.match(/\/watch2gether\/\d+/)) {
      checkForPlayer()
      const animeicon = document.querySelector('img[class="img-fluid lozad rounded tooltip tooltip-anime mb-2 tooltipstered"]')
      const name = document.querySelector('h5[class="card-title text-dark"]')
      const infoElem = document.querySelector('h6[class="card-subtitle mb-2 text-muted"]')
      const spans = infoElem?.querySelectorAll('span[class="text-gray"]')

      if (spans == null || spans.length === 0)
        return presence.clearActivity()

      const episode = spans[0]?.textContent
      const roomName = spans[spans.length - 1]?.textContent

      if (name) {
        presenceData.details = name.textContent
        presenceData.state = `Odcinek ${episode} • Pokój '${roomName}'`
      }
      else {
        return presence.clearActivity()
      }

      if (player != null && isPlaying) {
        const timestamps = getTimestamps(player.currentTime, player.duration)
        presenceData.startTimestamp = timestamps[0]
        presenceData.endTimestamp = timestamps[1]
      }
      else if (!isPlaying && !browsingStatusEnabled && hideWhenPaused) {
        return presence.clearActivity()
      }

      if (animeicon) {
        presenceData.smallImageKey = 'https://cdn.rcd.gg/PreMiD/websites/O/ogladajanime/assets/0.png'
        presenceData.largeImageKey = animeicon.getAttribute('data-src')?.split(' ')[0]
      }

      presenceData.buttons = await setButton('Obejrzyj ze mną', document.location.href)
    }
    else if (pathname.includes('/character/') && browsingStatusEnabled) {
      const characterInfo = document.getElementById('animemenu_info')
      const name = characterInfo?.querySelector('div[class="row card-body justify-content-center"] h4[class="card-title col-12 text-center mb-1"]')
      const image = document.querySelector('img[class="img-fluid lozad rounded text-center"]')?.getAttribute('data-src')?.trim()
      presenceData.buttons = await setButton('Zobacz Postać', document.location.href)
      if (name)
        presenceData.details = `Sprawdza postać '${name?.textContent}'`
      else
        presenceData.details = 'Sprawdza postać'
      if (image) {
        presenceData.largeImageKey = image
        presenceData.smallImageKey = 'https://cdn.rcd.gg/PreMiD/websites/O/ogladajanime/assets/0.png'
      }
    }
    else {
      if (browsingStatusEnabled) {
        let recognized = false
        for (const [key, value] of Object.entries(staticBrowsing)) {
          if (pathname.includes(key)) {
            presenceData.details = value
            presenceData.buttons = await profileButton()
            recognized = true
            break
          }
        }

        if (!recognized)
          return presence.clearActivity()
      }
      else {
        return presence.clearActivity()
      }
    }

    presence.setActivity(presenceData)
  })
}

function getUserID() {
  const dropdowns = document.querySelectorAll('a[class="dropdown-item"]')
  dropdowns.forEach((elem, _, __) => {
    const href = elem.getAttribute('href')
    if (href != null && href.startsWith('/profile/')) {
      userID = Number.parseInt(href.replace('/profile/', ''))
    }
  })
}

async function setButton(label: string, url: string): Promise<[ButtonData, (ButtonData | undefined)]> {
  const privacyMode = await presence.getSetting<boolean>('privacyMode')
  if (privacyMode || userID === 0)
    return [{ label, url }, undefined]
  else
    return [{ label: 'Mój profil', url: `https://ogladajanime.pl/profile/${userID}` }, { label, url }]
}

async function profileButton(): Promise<[ButtonData, undefined] | undefined> {
  const privacyMode = await presence.getSetting<boolean>('privacyMode')
  if (privacyMode || userID === 0)
    return undefined
  else
    return [{ label: 'Mój profil', url: `https://ogladajanime.pl/profile/${userID}` }, undefined]
}

function watchedString(num: number): string {
  if (num === 0)
    return `${num} obejrzanych`
  else if (num < 5)
    return `${num} obejrzane`
  else
    return `${num} obejrzanych`
}

function commentsString(num: number): string {
  if (num === 1)
    return `${num} wysłany komentarz`
  else
    return `${num} wysłanych komentarzy`
}

function checkForPlayer() {
  const { pathname } = document.location
  if (pathname.includes('/anime') || pathname.includes('/watch2gether/')) {
    const _player = document.querySelector('video')
    if (_player != null) {
      if (player != null) {
        player.removeEventListener('playing', playerPlaying)
        player.removeEventListener('pause', playerPaused)
        player.removeEventListener('durationchange', playerDurationChange)
        player.removeEventListener('timeupdate', playerTimeChange)
      }
      player = _player
      player.addEventListener('playing', playerPlaying)
      player.addEventListener('pause', playerPaused)
      player.addEventListener('durationchange', playerDurationChange)
      player.addEventListener('timeupdate', playerTimeChange)
    }
  }
}

function playerPlaying() {
  isPlaying = true
  updatePresence()
}

function playerPaused() {
  isPlaying = false
  updatePresence()
}

function playerDurationChange() {
  updatePresence()
}

let previousTime = 0

function playerTimeChange() {
  if (Math.abs(player.currentTime - previousTime) > 2) {
    updatePresence()
  }
  previousTime = player.currentTime
}

updatePresence()
