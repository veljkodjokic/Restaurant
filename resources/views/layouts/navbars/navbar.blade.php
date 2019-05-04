@auth()
    @if(\Auth::user()->isAdmin())
        @include('layouts.navbars.navs.auth')
    @else
        @include('layouts.navbars.navs.auth')
    @endif
@endauth