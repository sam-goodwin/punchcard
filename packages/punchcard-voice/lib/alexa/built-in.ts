import { integer, string } from "punchcard";
import { Omit } from "punchcard/lib/utils";
import { Intent, IntentProps, SlotType } from "./skill";

// tslint:disable: variable-name

export const isBuiltIn = Symbol.for('punchcard:voice:isBuiltIn');

export class BuiltInIntent extends Intent<{}> {
  public readonly [isBuiltIn]: true;

  constructor(props: IntentProps<{}>) {
    super(props);
  }
}

// intents
export namespace AMAZON {
  export const SelectIntent = new BuiltInIntent({
    name: 'AMAZON.SelectIntent',
    slots: {
      Anaphor: AMAZON.Anaphor,
      ListPosition: AMAZON.Ordinal,
      PositionRelation: AMAZON.RelativePosition,
      VisualModeTrigger: AMAZON.VisualModeTrigger
    }
  });

  export const CancelIntent = new BuiltInIntent({
    name: 'AMAZON.CancelIntent'
  });
  export const FallbackIntent = new BuiltInIntent({
    name: 'AMAZON.FallbackIntent'
  });
  export const HelpIntent = new BuiltInIntent({
    name: 'AMAZON.HelpIntent'
  });
  export const LoopOffIntent = new BuiltInIntent({
    name: 'AMAZON.LoopOffIntent'
  });
  export const LoopOnIntent = new BuiltInIntent({
    name: 'AMAZON.LoopOnIntent'
  });
  export const MoreIntent = new BuiltInIntent({
    name: 'AMAZON.MoreIntent'
  });
  export const NavigateHomeIntent = new BuiltInIntent({
    name: 'AMAZON.NavigateHomeIntent'
  });
  export const NavigateSettingsIntent = new BuiltInIntent({
    name: 'AMAZON.NavigateSettingsIntent'
  });
  export const NextIntent = new BuiltInIntent({
    name: 'AMAZON.NextIntent'
  });
  export const NoIntent = new BuiltInIntent({
    name: 'AMAZON.NoIntent'
  });
  export const PageDownIntent = new BuiltInIntent({
    name: 'AMAZON.PageDownIntent'
  });
  export const PageUpIntent = new BuiltInIntent({
    name: 'AMAZON.PageUpIntent'
  });
  export const PauseIntent = new BuiltInIntent({
    name: 'AMAZON.PauseIntent'
  });
  export const PreviousIntent = new BuiltInIntent({
    name: 'AMAZON.PreviousIntent'
  });
  export const RepeatIntent = new BuiltInIntent({
    name: 'AMAZON.RepeatIntent'
  });
  export const ResumeIntent = new BuiltInIntent({
    name: 'AMAZON.ResumeIntent'
  });
  export const ScrollDownIntent = new BuiltInIntent({
    name: 'AMAZON.ScrollDownIntent'
  });
  export const ScrollLeftIntent = new BuiltInIntent({
    name: 'AMAZON.ScrollLeftIntent'
  });
  export const ScrollRightIntent = new BuiltInIntent({
    name: 'AMAZON.ScrollRightIntent'
  });
  export const ScrollUpIntent = new BuiltInIntent({
    name: 'AMAZON.ScrollUpIntent'
  });
  export const ShuffleOffIntent = new BuiltInIntent({
    name: 'AMAZON.ShuffleOffIntent'
  });
  export const ShuffleOnIntent = new BuiltInIntent({
    name: 'AMAZON.ShuffleOnIntent'
  });
  export const StartOverIntent = new BuiltInIntent({
    name: 'AMAZON.StartOverIntent'
  });
  export const StopIntent = new BuiltInIntent({
    name: 'AMAZON.StopIntent'
  });
  export const YesIntent = new BuiltInIntent({
    name: 'AMAZON.YesIntent'
  });
}

// slots
export namespace AMAZON {
  export const DATE = new SlotType({
    name: 'AMAZON.DATE',
    type: string() // TODO: better type
  });
  export const DURATION = new SlotType({
    name: 'AMAZON.DURATION',
    type: string() // TODO: better type
  });
  export const FOUR_DIGIT_NUMBER = new SlotType({
    name: 'AMAZON.FOUR_DIGIT_NUMBER',
    type: integer()
  });
  export const NUMBER = new SlotType({
    name: 'AMAZON.NUMBER',
    type: integer()
  });
  export const Ordinal = new SlotType({
    name: 'AMAZON.Ordinal',
    type: integer()
  });
  export const PhoneNumber = new SlotType({
    name: 'AMAZON.Ordinal',
    type: string()
  });
  export const SearchQuery = new SlotType({
    name: 'AMAZON.SearchQuery',
    type: string() // TODO: better type
  });
  export const TIME = new SlotType({
    name: 'AMAZON.TIME',
    type: string() // TODO: better type
  });

  export const Actor = new SlotType({
    name: 'AMAZON.Actor',
    type: string()
  });
  export const AdministrativeArea = new SlotType({
    name: 'AMAZON.AdministrativeArea',
    type: string()
  });
  export const AggregateRating = new SlotType({
    name: 'AMAZON.AggregateRating',
    type: string()
  });
  export const Airline = new SlotType({
    name: 'AMAZON.Airline',
    type: string()
  });
  export const Airport = new SlotType({
    name: 'AMAZON.Airport',
    type: string()
  });
  export const Anaphor = new SlotType({
    name: 'AMAZON.Anaphor',
    type: string()
  });
  export const Animal = new SlotType({
    name: 'AMAZON.Animal',
    type: string()
  });
  export const Artist = new SlotType({
    name: 'AMAZON.Artist',
    type: string()
  });
  export const AT_CITY = new SlotType({
    name: 'AMAZON.AT_CITY',
    type: string()
  });
  export const AT_REGION = new SlotType({
    name: 'AMAZON.AT_REGION',
    type: string()
  });
  export const Athlete = new SlotType({
    name: 'AMAZON.Athlete',
    type: string()
  });
  export const Author = new SlotType({
    name: 'AMAZON.Author',
    type: string()
  });
  export const Book = new SlotType({
    name: 'AMAZON.Book',
    type: string()
  });
  export const BookSeries = new SlotType({
    name: 'AMAZON.BookSeries',
    type: string()
  });
  export const BroadcastChannel = new SlotType({
    name: 'AMAZON.BroadcastChannel',
    type: string()
  });
  export const CivicStructure = new SlotType({
    name: 'AMAZON.CivicStructure',
    type: string()
  });
  export const Color = new SlotType({
    name: 'AMAZON.Color',
    type: string()
  });
  export const Comic = new SlotType({
    name: 'AMAZON.Comic',
    type: string()
  });
  export const Corporation = new SlotType({
    name: 'AMAZON.Corporation',
    type: string()
  });
  export const Country = new SlotType({
    name: 'AMAZON.Country',
    type: string()
  });
  export const CreativeWorkType = new SlotType({
    name: 'AMAZON.CreativeWorkType',
    type: string()
  });
  export const DayOfWeek = new SlotType({
    name: 'AMAZON.DayOfWeek',
    type: string()
  });
  export const DE_CITY = new SlotType({
    name: 'AMAZON.DE_CITY',
    type: string()
  });
  export const DE_FIRST_NAME = new SlotType({
    name: 'AMAZON.DE_FIRST_NAME',
    type: string()
  });
  export const DE_REGION = new SlotType({
    name: 'AMAZON.DE_REGION',
    type: string()
  });
  export const Dessert = new SlotType({
    name: 'AMAZON.Dessert',
    type: string()
  });
  export const DeviceType = new SlotType({
    name: 'AMAZON.DeviceType',
    type: string()
  });
  export const Director = new SlotType({
    name: 'AMAZON.Director',
    type: string()
  });
  export const Drink = new SlotType({
    name: 'AMAZON.Drink',
    type: string()
  });
  export const EducationalOrganization = new SlotType({
    name: 'AMAZON.EducationalOrganization',
    type: string()
  });
  export const EUROPE_CITY = new SlotType({
    name: 'AMAZON.EUROPE_CITY',
    type: string()
  });
  export const EventType = new SlotType({
    name: 'AMAZON.EventType',
    type: string()
  });
  export const Festival = new SlotType({
    name: 'AMAZON.Festival',
    type: string()
  });
  export const FictionalCharacter = new SlotType({
    name: 'AMAZON.FictionalCharacter',
    type: string()
  });
  export const FinancialService = new SlotType({
    name: 'AMAZON.FinancialService',
    type: string()
  });
  export const Food = new SlotType({
    name: 'AMAZON.Food',
    type: string()
  });
  export const FoodEstablishment = new SlotType({
    name: 'AMAZON.FoodEstablishment',
    type: string()
  });
  export const Game = new SlotType({
    name: 'AMAZON.Game',
    type: string()
  });
  export const GB_CITY = new SlotType({
    name: 'AMAZON.GB_CITY',
    type: string()
  });
  export const GB_FIRST_NAME = new SlotType({
    name: 'AMAZON.GB_FIRST_NAME',
    type: string()
  });
  export const GB_REGION = new SlotType({
    name: 'AMAZON.GB_REGION',
    type: string()
  });
  export const Genre = new SlotType({
    name: 'AMAZON.Genre',
    type: string()
  });
  export const Landform = new SlotType({
    name: 'AMAZON.Landform',
    type: string()
  });
  export const LandmarksOrHistoricalBuildings = new SlotType({
    name: 'AMAZON.LandmarksOrHistoricalBuildings',
    type: string()
  });
  export const Language = new SlotType({
    name: 'AMAZON.Language',
    type: string()
  });
  export const LocalBusiness = new SlotType({
    name: 'AMAZON.LocalBusiness',
    type: string()
  });
  export const LocalBusinessType = new SlotType({
    name: 'AMAZON.LocalBusinessType',
    type: string()
  });
  export const MedicalOrganization = new SlotType({
    name: 'AMAZON.MedicalOrganization',
    type: string()
  });
  export const Month = new SlotType({
    name: 'AMAZON.Month',
    type: string()
  });
  export const Movie = new SlotType({
    name: 'AMAZON.Movie',
    type: string()
  });
  export const MovieSeries = new SlotType({
    name: 'AMAZON.MovieSeries',
    type: string()
  });
  export const MovieTheater = new SlotType({
    name: 'AMAZON.MovieTheater',
    type: string()
  });
  export const MusicAlbum = new SlotType({
    name: 'AMAZON.MusicAlbum',
    type: string()
  });
  export const MusicCreativeWorkType = new SlotType({
    name: 'AMAZON.MusicCreativeWorkType',
    type: string()
  });
  export const MusicEvent = new SlotType({
    name: 'AMAZON.MusicEvent',
    type: string()
  });
  export const MusicGroup = new SlotType({
    name: 'AMAZON.MusicGroup',
    type: string()
  });
  export const Musician = new SlotType({
    name: 'AMAZON.Musician',
    type: string()
  });
  export const MusicPlaylist = new SlotType({
    name: 'AMAZON.MusicPlaylist',
    type: string()
  });
  export const MusicRecording = new SlotType({
    name: 'AMAZON.MusicRecording',
    type: string()
  });
  export const MusicVenue = new SlotType({
    name: 'AMAZON.MusicVenue',
    type: string()
  });
  export const MusicVideo = new SlotType({
    name: 'AMAZON.MusicVideo',
    type: string()
  });
  export const Organization = new SlotType({
    name: 'AMAZON.Organization',
    type: string()
  });
  export const Person = new SlotType({
    name: 'AMAZON.Person',
    type: string()
  });
  export const PostalAddress = new SlotType({
    name: 'AMAZON.PostalAddress',
    type: string()
  });
  export const Professional = new SlotType({
    name: 'AMAZON.Professional',
    type: string()
  });
  export const ProfessionalType = new SlotType({
    name: 'AMAZON.ProfessionalType',
    type: string()
  });
  export const RadioChannel = new SlotType({
    name: 'AMAZON.RadioChannel',
    type: string()
  });
  export const RelativePosition = new SlotType({
    name: 'AMAZON.RelativePosition',
    type: string()
  });
  export const Residence = new SlotType({
    name: 'AMAZON.Residence',
    type: string()
  });
  export const Room = new SlotType({
    name: 'AMAZON.Room',
    type: string()
  });
  export const ScreeningEvent = new SlotType({
    name: 'AMAZON.ScreeningEvent',
    type: string()
  });
  export const Service = new SlotType({
    name: 'AMAZON.Service',
    type: string()
  });
  export const SocialMediaPlatform = new SlotType({
    name: 'AMAZON.SocialMediaPlatform',
    type: string()
  });
  export const SoftwareApplication = new SlotType({
    name: 'AMAZON.SoftwareApplication',
    type: string()
  });
  export const SoftwareGame = new SlotType({
    name: 'AMAZON.SoftwareGame',
    type: string()
  });
  export const Sport = new SlotType({
    name: 'AMAZON.Sport',
    type: string()
  });
  export const SportsEvent = new SlotType({
    name: 'AMAZON.SportsEvent',
    type: string()
  });
  export const SportsTeam = new SlotType({
    name: 'AMAZON.SportsTeam',
    type: string()
  });
  export const StreetAddress = new SlotType({
    name: 'AMAZON.StreetAddress',
    type: string()
  });
  export const StreetName = new SlotType({
    name: 'AMAZON.StreetName',
    type: string()
  });
  export const TelevisionChannel = new SlotType({
    name: 'AMAZON.TelevisionChannel',
    type: string()
  });
  export const TVEpisode = new SlotType({
    name: 'AMAZON.TVEpisode',
    type: string()
  });
  export const TVSeason = new SlotType({
    name: 'AMAZON.TVSeason',
    type: string()
  });
  export const TVSeries = new SlotType({
    name: 'AMAZON.TVSeries',
    type: string()
  });
  export const US_CITY = new SlotType({
    name: 'AMAZON.US_CITY',
    type: string()
  });
  export const US_FIRST_NAME = new SlotType({
    name: 'AMAZON.US_FIRST_NAME',
    type: string()
  });
  export const US_STATE = new SlotType({
    name: 'AMAZON.US_STATE',
    type: string()
  });
  export const VideoGame = new SlotType({
    name: 'AMAZON.VideoGame',
    type: string()
  });
  export const VisualModeTrigger = new SlotType({
    name: 'AMAZON.VisualModeTrigger',
    type: string()
  });
  export const WeatherCondition = new SlotType({
    name: 'AMAZON.WeatherCondition',
    type: string()
  });
  export const WrittenCreativeWorkType = new SlotType({
    name: 'AMAZON.WrittenCreativeWorkType',
    type: string()
  });
}
